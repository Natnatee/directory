import Image from "next/image";
import Link from "next/link";
import { getProviders } from "@/lib/providers";

const iconFor = (category: string) => {
  if (/พัก|โรงแรม/.test(category)) return "⌂";
  if (/อาหาร|Catering/.test(category)) return "◒";
  if (/สถานที่|โลเคชั่น|Location/.test(category)) return "▣";
  if (/Production|ผลิต/.test(category)) return "▤";
  if (/บุคลากร|ทีมงาน|ฟรีแลนซ์/.test(category)) return "✦";
  if (/ขนส่ง|ยานพาหนะ/.test(category)) return "➤";
  if (/ท่องเที่ยว|สันทนาการ/.test(category)) return "☀";
  return "✳";
};

export default async function Home() {
  const providers = await getProviders();
  const categories = [...new Set(providers.flatMap((item) => item.categories).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th"));
  const featured = providers.filter((item) => item.name).slice(0, 3);

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="brand"><span className="brand-mark">✳</span><span>PATTAYA<span className="brand-light"> FILM</span><small>SUPPLIER DIRECTORY</small></span></Link>
          <nav className="nav-links" aria-label="เมนูหลัก"><Link href="#categories">หมวดหมู่</Link><Link href="/providers">รายชื่อทั้งหมด</Link><Link className="nav-cta" href="/providers">ค้นหาผู้ให้บริการ <span>↗</span></Link></nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-content">
            <div className="hero-copy">
              <span className="eyebrow light"><span className="eyebrow-line" /> PATTAYA FILM DIRECTORY</span>
              <h1>ทุกความเป็นไปได้<br />ของงานสร้างสรรค์<br /><em>เริ่มต้นที่นี่</em></h1>
              <p>ค้นพบผู้ให้บริการ ทีมงาน และสถานที่สำหรับงานกองถ่ายในพัทยาและพื้นที่ใกล้เคียง ครบในที่เดียว</p>
              <form action="/providers" className="hero-search" role="search"><label className="sr-only" htmlFor="hero-q">ค้นหาผู้ให้บริการ</label><span className="search-icon" aria-hidden="true">⌕</span><input id="hero-q" name="q" placeholder="ค้นหาชื่อธุรกิจหรือบริการ..." /><button type="submit">ค้นหา <span>↗</span></button></form>
              <div className="hero-stats"><span><strong>{providers.length}</strong> ผู้ให้บริการ</span><i /><span><strong>{categories.length}</strong> หมวดหมู่</span><i /><span>พร้อมให้คุณค้นพบ</span></div>
            </div>
            <div className="hero-art"><Image src="/Cover Facebook02.jpg" alt="กราฟิก Pattaya Film เมืองชายทะเลและอุปกรณ์ภาพยนตร์" width={1200} height={600} priority /></div>
          </div>
          <div className="hero-bottom" />
        </section>

        <section className="intro-strip"><div className="container strip-inner"><span>DISCOVER <b>•</b> CONNECT <b>•</b> CREATE</span><p>เชื่อมต่อคนเบื้องหลัง สู่ผลงานที่น่าจดจำ</p><span className="strip-star">✳</span></div></section>

        <section className="section categories-section" id="categories"><div className="container"><div className="section-heading"><div><span className="eyebrow">EXPLORE BY CATEGORY</span><h2>ค้นหาตาม<span>หมวดหมู่</span></h2><p>ทุกสิ่งที่กองถ่ายของคุณต้องการ อยู่ใกล้แค่คลิกเดียว</p></div><Link className="text-link" href="/providers">ดูรายชื่อทั้งหมด <span>↗</span></Link></div>
          <div className="category-grid">{categories.map((category, index) => <Link key={category} className="category-card" href={`/providers?category=${encodeURIComponent(category)}`}><span className={`category-icon icon-${index % 4}`}>{iconFor(category)}</span><span className="category-count">{String(index + 1).padStart(2, "0")} / {String(categories.length).padStart(2, "0")}</span><strong>{category}</strong><span className="category-card-bottom"><span>{providers.filter((item) => item.categories.includes(category)).length} รายชื่อ</span><span className="round-arrow">↗</span></span></Link>)}</div>
        </div></section>

        <section className="section featured-section"><div className="container"><div className="section-heading"><div><span className="eyebrow">FEATURED DIRECTORY</span><h2>เริ่มต้น<span>สำรวจ</span></h2><p>ทำความรู้จักผู้ให้บริการในเครือข่ายของเรา</p></div><Link className="text-link" href="/providers">สำรวจทั้งหมด <span>↗</span></Link></div><div className="provider-grid">{featured.map((item) => <Link href={`/providers/${encodeURIComponent(item.id)}`} className="provider-card" key={item.id}><div className="provider-visual bg-zinc-100">{item.image && <Image src={item.image} alt={item.name || item.nameEn} width={600} height={400} unoptimized className="h-full w-full object-cover" />}</div><div className="provider-body"><span className="provider-tag">{item.categories.join(" / ")}</span><h3>{item.name}</h3><p>{item.area || item.serviceArea || "ไม่ระบุพื้นที่"}</p><span className="card-link">ดูรายละเอียด <span>↗</span></span></div></Link>)}</div></div></section>

        <section className="banner-section"><div className="container banner-inner"><div><span className="eyebrow light">YOUR NEXT PROJECT STARTS HERE</span><h2>เรื่องราวดี ๆ เริ่มจาก<br />การเชื่อมต่อที่ใช่</h2><p>ค้นหาพาร์ทเนอร์สำหรับโปรเจกต์ภาพยนตร์ของคุณวันนี้</p><Link className="banner-button" href="/providers">ค้นหาผู้ให้บริการ <span>↗</span></Link></div><Image src="/Cover Facebook02.jpg" alt="ศิลปะภาพยนตร์และเมืองพัทยา" width={800} height={400} /></div></section>
      </main>
      <footer className="site-footer"><div className="container footer-inner"><div><span className="footer-brand">✳ PATTAYA FILM</span><p>พื้นที่เชื่อมต่อผู้สร้างสรรค์และผู้ให้บริการกองถ่าย</p></div><span>© {new Date().getFullYear()} Pattaya Film Supplier Directory</span></div></footer>
    </>
  );
}
