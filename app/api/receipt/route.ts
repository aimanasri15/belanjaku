import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = "nodejs";

const apiKey = process.env.GEMINI_API_KEY;

const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
    })
  : null;

const models = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

const receiptSchema = {
  type: Type.OBJECT,
  properties: {
    merchant: {
      type: Type.STRING,
    },

    date: {
      type: Type.STRING,
    },

    total: {
      type: Type.NUMBER,
    },

    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
          },

          quantity: {
            type: Type.NUMBER,
          },

          price: {
            type: Type.NUMBER,
          },

          category: {
            type: Type.STRING,
          },
        },

        required: [
          "name",
          "quantity",
          "price",
          "category",
        ],
      },
    },
  },

  required: [
    "merchant",
    "date",
    "total",
    "items",
  ],
};

const receiptPrompt = `
Anda ialah AI pembaca resit untuk aplikasi kewangan BelanjaKu.

Baca gambar resit ini dengan teliti.

Ekstrak maklumat sebenar daripada resit.

PULANGKAN DATA MENGIKUT JSON SCHEMA YANG DIBERIKAN.

PERATURAN:

1. merchant
   - Nama kedai atau perniagaan.

2. date
   - Tarikh transaksi.
   - Gunakan format YYYY-MM-DD.
   - Jika tarikh tidak dapat dibaca, gunakan "".

3. total
   - Jumlah akhir yang pelanggan bayar.
   - Jangan gunakan subtotal.
   - Jangan gunakan jumlah sebelum diskaun jika terdapat jumlah akhir.

4. items
   - Hanya barang atau perkhidmatan yang benar-benar dibeli.
   - Jangan masukkan subtotal.
   - Jangan masukkan tax/SST.
   - Jangan masukkan jumlah keseluruhan sebagai item.

5. quantity
   - Kuantiti barang.
   - Jika tidak dinyatakan, gunakan 1.

6. price
   - Harga seunit.

7. category
   Mesti menggunakan salah satu kategori berikut sahaja:

   Makan & Minum
   Anak
   Minyak
   Rumah
   Kereta
   Shopping
   Komitmen
   Lain-lain

8. Gunakan kategori "Anak" untuk:
   - Pampers
   - Diapers
   - Susu bayi
   - Baby food
   - Baby wipes
   - Barang bayi
   - Baby toiletries
   - Keperluan anak

9. Gunakan kategori "Minyak" untuk:
   - Petrol
   - Diesel
   - Minyak kenderaan

10. Gunakan kategori "Rumah" untuk:
   - Barang dapur
   - Barang rumah
   - Cleaning supplies
   - Keperluan rumah

11. Gunakan kategori "Makan & Minum" untuk:
   - Makanan
   - Minuman
   - Restoran
   - Cafe
   - Fast food

12. Gunakan kategori "Kereta" untuk:
   - Car wash
   - Servis kereta
   - Spare part
   - Aksesori kereta

13. Gunakan kategori "Shopping" untuk:
   - Pakaian
   - Kasut
   - Barang elektronik
   - Barang peribadi
   - Barang umum yang bukan kategori lain

14. Jangan reka maklumat yang tidak wujud pada resit.

15. Jika tulisan tidak jelas:
   - Gunakan "" untuk teks.
   - Gunakan 0 untuk nombor.

16. Jangan anggap kedai tersebut Starbucks atau mana-mana kedai tertentu.

17. Resit boleh menggunakan Bahasa Melayu, English atau campuran.

18. Cuba pastikan jumlah item munasabah dengan total resit.

19. Jangan masukkan nombor resit, nombor telefon, nombor cashier atau nombor transaksi sebagai harga item.

20. Jika terdapat diskaun:
   - Gunakan harga sebenar selepas diskaun jika jelas.
`;

// Download image from Supabase
async function downloadImage(imageUrl: string) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(
      `Gagal mengambil gambar resit. HTTP ${response.status}`
    );
  }

  const buffer = await response.arrayBuffer();

  const base64 = Buffer.from(buffer).toString("base64");

  const contentType =
    response.headers.get("content-type") ||
    "image/jpeg";

  return {
    base64,
    contentType,
  };
}

// Check if error is temporary
function isTemporaryError(error: any) {
  const status =
    error?.status ||
    error?.code ||
    error?.response?.status;

  const message =
    error?.message?.toLowerCase?.() || "";

  return (
    status === 503 ||
    status === 429 ||
    message.includes("high demand") ||
    message.includes("unavailable") ||
    message.includes("overloaded") ||
    message.includes("temporarily")
  );
}

// Wait helper
function wait(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

// Call Gemini with retry
async function callGemini(
  model: string,
  base64Image: string,
  contentType: string
) {
  if (!ai) {
    throw new Error(
      "GEMINI_API_KEY belum ditetapkan."
    );
  }

  let lastError: any = null;

  // Maximum 3 attempts
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(
        `Gemini model: ${model} | attempt: ${attempt}`
      );

      const response =
        await ai.models.generateContent({
          model,

          contents: [
            {
              parts: [
                {
                  text: receiptPrompt,
                },

                {
                  inlineData: {
                    mimeType: contentType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],

          config: {
            responseMimeType: "application/json",
            responseSchema: receiptSchema,
          },
        });

      return response;
    } catch (error: any) {
      lastError = error;

      console.error(
        `Gemini error (${model}, attempt ${attempt}):`,
        error
      );

      if (!isTemporaryError(error)) {
        throw error;
      }

      // Jangan retry terus-terusan.
      // Tunggu sedikit sebelum cuba lagi.
      if (attempt < 3) {
        const delay = attempt * 1500;

        console.log(
          `Temporary error. Retry dalam ${delay}ms...`
        );

        await wait(delay);
      }
    }
  }

  throw lastError;
}

// Clean AI result
function cleanReceipt(receipt: any) {
  const items = Array.isArray(receipt?.items)
    ? receipt.items
    : [];

  return {
    merchant:
      typeof receipt?.merchant === "string"
        ? receipt.merchant.trim()
        : "",

    date:
      typeof receipt?.date === "string"
        ? receipt.date.trim()
        : "",

    total:
      typeof receipt?.total === "number"
        ? receipt.total
        : Number(receipt?.total) || 0,

    items: items.map((item: any) => {
      const quantity =
        typeof item?.quantity === "number"
          ? item.quantity
          : Number(item?.quantity) || 1;

      const price =
        typeof item?.price === "number"
          ? item.price
          : Number(item?.price) || 0;

      const allowedCategories = [
        "Makan & Minum",
        "Anak",
        "Minyak",
        "Rumah",
        "Kereta",
        "Shopping",
        "Komitmen",
        "Lain-lain",
      ];

      const category =
        typeof item?.category === "string" &&
        allowedCategories.includes(item.category)
          ? item.category
          : "Lain-lain";

      return {
        name:
          typeof item?.name === "string"
            ? item.name.trim()
            : "",

        quantity,

        price,

        category,
      };
    }),
  };
}

export async function POST(request: Request) {
  try {
    console.log("");
    console.log(
      "========================================"
    );
    console.log("BELANJAKU GEMINI RECEIPT SCANNER");
    console.log(
      "========================================"
    );

    // -----------------------------------------
    // Check API key
    // -----------------------------------------

    if (!apiKey) {
      console.error(
        "GEMINI_API_KEY tidak dijumpai."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "GEMINI_API_KEY belum ditetapkan dalam .env.local.",
        },
        { status: 500 }
      );
    }

    // -----------------------------------------
    // Read request
    // -----------------------------------------

    const body = await request.json();

    const imageUrl = body?.imageUrl;

    console.log(
      "Receipt URL:",
      imageUrl
    );

    if (
      typeof imageUrl !== "string" ||
      !imageUrl
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "URL gambar resit tidak dijumpai.",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // Download receipt image
    // -----------------------------------------

    console.log(
      "Downloading receipt image..."
    );

    const {
      base64,
      contentType,
    } = await downloadImage(imageUrl);

    console.log(
      "Image downloaded:",
      contentType
    );

    // -----------------------------------------
    // Try Gemini models
    // -----------------------------------------

    let finalResponse: any = null;
    let successfulModel = "";

    for (const model of models) {
      try {
        console.log(
          `Trying model: ${model}`
        );

        finalResponse =
          await callGemini(
            model,
            base64,
            contentType
          );

        successfulModel = model;

        console.log(
          `SUCCESS with model: ${model}`
        );

        break;
      } catch (error: any) {
        console.error(
          `Model failed: ${model}`
        );

        console.error(error);

        // Kalau bukan temporary error,
        // terus hentikan.
        if (!isTemporaryError(error)) {
          throw error;
        }

        console.log(
          `Trying next model...`
        );
      }
    }

    // -----------------------------------------
    // No model succeeded
    // -----------------------------------------

    if (!finalResponse) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Semua model Gemini sedang tidak tersedia. Cuba semula sebentar lagi.",
        },
        { status: 503 }
      );
    }

    // -----------------------------------------
    // Get Gemini text
    // -----------------------------------------

    const output =
      finalResponse.text;

    console.log(
      "Successful model:",
      successfulModel
    );

    console.log(
      "Gemini output:"
    );

    console.log(output);

    if (!output) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Gemini tidak menghasilkan bacaan resit.",
        },
        { status: 422 }
      );
    }

    // -----------------------------------------
    // Parse JSON
    // -----------------------------------------

    let receipt;

    try {
      receipt = JSON.parse(output);
    } catch (error) {
      console.error(
        "JSON parse error:",
        error
      );

      console.error(
        "Raw Gemini output:",
        output
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Gemini menghasilkan data yang tidak sah.",
        },
        { status: 422 }
      );
    }

    // -----------------------------------------
    // Clean result
    // -----------------------------------------

    const cleanedReceipt =
      cleanReceipt(receipt);

    console.log(
      "Clean receipt:"
    );

    console.log(
      cleanedReceipt
    );

    // -----------------------------------------
    // Success
    // -----------------------------------------

    console.log(
      "========================================"
    );

    console.log(
      "GEMINI RECEIPT SCAN SUCCESS"
    );

    console.log(
      "========================================"
    );

    return NextResponse.json({
      success: true,

      data: cleanedReceipt,

      model: successfulModel,
    });
  } catch (error: any) {
    console.error("");
    console.error(
      "========================================"
    );

    console.error(
      "GEMINI RECEIPT SCANNER ERROR"
    );

    console.error(
      "========================================"
    );

    console.error(error);

    const status =
      error?.status ||
      error?.code;

    const message =
      error?.message ||
      "Gagal memproses gambar resit.";

    console.error(
      "Status:",
      status
    );

    console.error(
      "Message:",
      message
    );

    // -----------------------------------------
    // Friendly errors
    // -----------------------------------------

    if (status === 429) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Gemini API sedang mencapai had penggunaan. Cuba semula kemudian.",
        },
        { status: 429 }
      );
    }

    if (status === 503) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Gemini sedang mengalami permintaan tinggi. Cuba semula sebentar lagi.",
        },
        { status: 503 }
      );
    }

    if (status === 400) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Request kepada Gemini tidak sah. Semak gambar resit atau konfigurasi API.",
        },
        { status: 400 }
      );
    }

    if (status === 401 || status === 403) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Gemini API key tidak sah atau tidak mempunyai akses.",
        },
        { status: status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}