import Link from "next/link";
import { getProviders } from "@/lib/providers";

export default async function ProvidersPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; area?: string }> }) {
  const params = await searchParams;
  const providers = await getProviders();
  const categories = [...new Set(providers.map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th"));
  const areas = [...new Set(providers.map((p) => p.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th"));
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const category = typeof params.category === "string" ? params.category : "";
  const area = typeof params.area === "string" ? params.area : "";
  const results = providers.filter((p) => (!category || p.category === category) && (!area || p.area === area) && (!q || [p.name, p.nameEn, p.category, p.area, p.serviceArea].some((value) => value.toLocaleLowerCase().includes(q.toLocaleLowerCase()))));

  return <>
    <header className="site-header"><div className="container header-inner"><Link href="/" className="brand"><span className="brand-mark">✳</span><span>PATTAYA<span className="brand-light"> FILM</span><small>SUPPLIER DIRECTORY</small></span></Link><nav className="nav-links"><Link href="/">หน้าแรก</Link><Link href="/providers">รายชื่อทั้งหมด</Link></nav></div></header>
    <main className="listing-main">
      <section className="listing-hero"><div className="container"><Link className="breadcrumb" href="/">หน้าแรก</Link><span className="breadcrumb-separator"> / </span><span>รายชื่อผู้ให้บริการ</span><div className="listing-heading"><div><span className="eyebrow light">THE DIRECTORY</span><h1>พบคนที่ใช่<br /><em>สำหรับทุกโปรเจกต์</em></h1><p>ค้นหาผู้ให้บริการกองถ่ายในพัทยาและพื้นที่ใกล้เคียง</p></div><span className="listing-decoration" aria-hidden="true">✳</span></div></div></section>
      <section className="container listing-content"><form className="filter-panel" action="/providers" method="get" role="search"><div className="filter-field search-field"><label htmlFor="q">ค้นหาชื่อหรือบริการ</label><input id="q" name="q" defaultValue={q} placeholder="พิมพ์ชื่อธุรกิจหรือหมวดหมู่" /></div><div className="filter-field"><label htmlFor="category">หมวดหมู่</label><select id="category" name="category" defaultValue={category}><option value="">ทุกหมวดหมู่</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select></div><div className="filter-field"><label htmlFor="area">พื้นที่</label><select id="area" name="area" defaultValue={area}><option value="">ทุกพื้นที่</option>{areas.map((a) => <option key={a} value={a}>{a}</option>)}</select></div><button className="filter-submit" type="submit">ค้นหา ↗</button></form>
      <div className="results-heading"><div><span className="eyebrow">EXPLORE THE NETWORK</span><h2>รายชื่อผู้ให้บริการ <span>({results.length})</span></h2></div>{(q || category || area) && <Link href="/providers" className="clear-link">ล้างตัวกรอง ×</Link>}</div>
      {results.length ? <div className="provider-grid listing-grid">{results.map((p, index) => <Link key={p.id} href={`/providers/${encodeURIComponent(p.id)}`} className="provider-card"><div className={`provider-visual visual-${index % 4}`}><span className="provider-initial">{p.category?.charAt(0) || "✳"}</span><span className="provider-number">{String(index + 1).padStart(2, "0")}</span></div><div className="provider-body"><span className="provider-tag">{p.category || "ผู้ให้บริการ"}</span><h3>{p.name || p.nameEn}</h3>{p.nameEn && p.nameEn !== p.name && <p className="provider-en">{p.nameEn}</p>}<p>⌖ {p.area || p.serviceArea || "ไม่ระบุพื้นที่"}</p><span className="card-link">ดูรายละเอียด <span>↗</span></span></div></Link>)}</div> : <div className="empty-state"><span>⌕</span><h3>ไม่พบรายชื่อที่ตรงกับการค้นหา</h3><p>ลองเปลี่ยนคำค้นหรือเลือกตัวกรองใหม่อีกครั้ง</p><Link className="banner-button" href="/providers">ดูรายชื่อทั้งหมด ↗</Link></div>}
      </section>
    </main>
    <footer className="site-footer"><div className="container footer-inner"><div><span className="footer-brand">✳ PATTAYA FILM</span><p>พื้นที่เชื่อมต่อผู้สร้างสรรค์และผู้ให้บริการกองถ่าย</p></div><span>© {new Date().getFullYear()} Pattaya Film Supplier Directory</span></div></footer>
  </>;
}
