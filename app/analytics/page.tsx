"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AnalyticsPage() {
  const [rows, setRows] = useState<{name:string;category:string;amount:number;expense_date:string}[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async()=>{ const {data:{user}}=await supabase.auth.getUser(); if(!user){location.href="/login";return;} const {data}=await supabase.from("expenses").select("name,category,amount,expense_date").eq("user_id",user.id).order("expense_date",{ascending:true}); setRows((data??[]).map(x=>({...x,amount:Number(x.amount)}))); setLoading(false); })(); },[]);
  const filtered=useMemo(()=>rows.filter(x=>x.expense_date.slice(0,7)===month),[rows,month]);
  const total=filtered.reduce((s,x)=>s+x.amount,0);
  const cats=useMemo(()=>Object.entries(filtered.reduce<Record<string,number>>((a,x)=>{a[x.category]=(a[x.category]??0)+x.amount;return a;},{})).sort((a,b)=>b[1]-a[1]),[filtered]);
  return <main className="min-h-screen bg-neutral-100 px-4 py-6 text-neutral-900"><div className="mx-auto max-w-2xl"><button onClick={()=>history.back()} className="mb-5 text-sm font-bold">← Dashboard</button><div className="rounded-3xl bg-neutral-900 p-6 text-white"><p className="text-xs uppercase tracking-widest text-white/50">Analytics</p><h1 className="mt-2 text-3xl font-bold">RM {total.toFixed(2)}</h1><p className="mt-1 text-sm text-white/60">Jumlah belanja bulan dipilih</p></div><div className="mt-4 rounded-3xl bg-white p-5 shadow-sm"><label className="text-xs font-bold text-neutral-400">Bulan</label><input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3"/></div><div className="mt-4 rounded-3xl bg-white p-5 shadow-sm"><h2 className="font-bold">Kategori</h2><div className="mt-4 space-y-4">{cats.map(([name,amount])=><div key={name}><div className="flex justify-between text-sm"><span>{name}</span><b>RM {amount.toFixed(2)}</b></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-neutral-900" style={{width:`${total?Math.min(100,amount/total*100):0}%`}}/></div></div>)}</div>{!loading&&!cats.length&&<p className="mt-4 text-sm text-neutral-400">Tiada data bulan ini.</p>}</div></div></main>;
}
