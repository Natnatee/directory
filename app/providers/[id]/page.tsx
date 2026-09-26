import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProviders } from "@/lib/providers";

export default async function ProviderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const providers = await getProviders();
  const provider = providers.find((item) => item.id === id);
  if (!provider) notFound();


  return (
    <>
      <header className="site-header"><div className="container header-inner"><Link href="/" className="brand"><span className="brand-mark">✳</span><span>PATTAYA<span className="brand-light"> FILM</span><small>SUPPLIER DIRECTORY</small></span></Link><nav className="nav-links" aria-label="เมนูหลัก"><Link href="/">หน้าแรก</Link><Link href="/providers">รายชื่อทั้งหมด</Link></nav></div></header>

      <main className="detail-shell mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <Link className="detail-back text-sm underline underline-offset-4" href="/providers">
          ← กลับไปรายชื่อทั้งหมด
        </Link>
        <article className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="detail-top grid md:grid-cols-[minmax(0,1fr)_2fr]">
            <div className="detail-image flex min-h-60 items-center justify-center bg-zinc-100 p-6 text-center text-3xl font-semibold text-zinc-600">
              <Image src="/Cover Facebook02.jpg" width={600} height={350} alt="กราฟิกภาพยนตร์และเมืองพัทยา" className="w-full h-auto" />
            </div>
            <div className="detail-main space-y-5 p-6 md:p-10">
              {provider.category && (
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{provider.category}</p>
              )}
              <div>
                <h1 className="text-3xl font-bold">{provider.name || provider.nameEn}</h1>
                {provider.nameEn && provider.nameEn !== provider.name && (
                  <p className="mt-2 text-zinc-600 dark:text-zinc-400">{provider.nameEn}</p>
                )}
              </div>
              <div className="detail-meta space-y-2 text-sm">
                {provider.area && <p><strong>พื้นที่:</strong> {provider.area}</p>}
                {provider.serviceArea && <p><strong>พื้นที่ให้บริการ:</strong> {provider.serviceArea}</p>}
              </div>
              {(provider.phone || provider.email || provider.facebook || provider.line) && (
                <dl className="contact-info">
                  {provider.phone && <div><dt>โทรศัพท์</dt><dd>{provider.phone}</dd></div>}
                  {provider.email && <div><dt>อีเมล</dt><dd>{provider.email}</dd></div>}
                  {provider.facebook && <div><dt>Facebook</dt><dd>{provider.facebook}</dd></div>}
                  {provider.line && <div><dt>LINE</dt><dd>{provider.line}</dd></div>}
                </dl>
              )}
              {(provider.website || provider.portfolio) && (
                <div className="contact-actions flex flex-wrap gap-3">
                  {provider.website && <a className="btn-outline rounded-lg border border-zinc-300 px-4 py-2" href={provider.website} target="_blank" rel="noopener noreferrer">เว็บไซต์ ↗</a>}
                  {provider.portfolio && <a className="btn-outline rounded-lg border border-zinc-300 px-4 py-2" href={provider.portfolio} target="_blank" rel="noopener noreferrer">ผลงาน ↗</a>}
                </div>
              )}
            </div>
          </div>
          {provider.details.length > 0 && (
            <section className="detail-fields border-t border-zinc-200 p-6 dark:border-zinc-800 md:p-10" aria-label="ข้อมูลเพิ่มเติม">
              <h2 className="mb-6 text-xl font-semibold">ข้อมูลเพิ่มเติม</h2>
              <dl className="grid gap-5 sm:grid-cols-2">
                {provider.details.map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-sm text-zinc-500 dark:text-zinc-400">{label}</dt>
                    <dd className="mt-1 whitespace-pre-line">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </article>
      </main>

      <footer className="site-footer"><div className="container footer-inner"><div><span className="footer-brand">✳ PATTAYA FILM</span><p>พื้นที่เชื่อมต่อผู้สร้างสรรค์และผู้ให้บริการกองถ่าย</p></div><span>© {new Date().getFullYear()} Pattaya Film Supplier Directory</span></div></footer>
    </>
  );
}
