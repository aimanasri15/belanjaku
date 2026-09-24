import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name:"BelanjaKu", short_name:"BelanjaKu", description:"Aplikasi pengurusan belanja peribadi.", start_url:"/", display:"standalone", background_color:"#f5f5f5", theme_color:"#171717", icons:[] }; }
