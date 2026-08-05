import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  Loader2,
  QrCode,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  createCreditOrder,
  createOrder,
  getPricing,
  getQris,
  getStatus,
} from "@/lib/subscription.functions";
import { fileToDataUrl } from "@/lib/audio";
import { formatIDR, getDeviceId } from "@/lib/device";
import { useLang, useT, type Lang } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export const Route = createFileRoute("/buy")({
  head: () => ({
    meta: [
      { title: "Buy Magic Talk — Plans & Credits" },
      {
        name: "description",
        content:
          "Choose a 30-day or annual Magic Talk plan or top up credits for Transcribe, Translate and AI Caption. Pay with QRIS and get your voucher code.",
      },
      { property: "og:title", content: "Buy Magic Talk — Plans & Credits" },
      {
        property: "og:description",
        content: "QRIS payment and receipt upload for Magic Talk plans and credit packs.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://magic-talk.lovable.app/buy" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://magic-talk.lovable.app/buy" }],
  }),
  component: BuyPage,
});

type Pricing = Awaited<ReturnType<typeof getPricing>>;
type LText = Record<Lang, string>;

const BT: Record<string, LText> = {
  title: {
    id: "Paket & Kredit", en: "Plans & credits", zh: "套餐与额度", ja: "プランとクレジット",
    ko: "요금제 및 크레딧", hi: "प्लान और क्रेडिट", es: "Planes y créditos", fr: "Forfaits et crédits",
    de: "Pläne & Guthaben", th: "แพ็กเกจและเครดิต", vi: "Gói & Tín dụng", ar: "الخطط والرصيد",
    tl: "Mga Plano at Credit", it: "Piani e crediti", he: "תוכניות ונקודות",
  },
  trial: { id: "Trial", en: "Trial", zh: "试用", ja: "トライアル", ko: "체험", hi: "ट्रायल", es: "Prueba", fr: "Essai", de: "Testphase", th: "ทดลองใช้", vi: "Dùng thử", ar: "تجريبي", tl: "Trial", it: "Prova", he: "ניסיון" },
  annual: { id: "Tahunan", en: "Annual", zh: "年付", ja: "年額", ko: "연간", hi: "वार्षिक", es: "Anual", fr: "Annuel", de: "Jährlich", th: "รายปี", vi: "Hàng năm", ar: "سنوي", tl: "Taunan", it: "Annuale", he: "שנתי" },
  monthly: { id: "Bulanan", en: "Monthly", zh: "月付", ja: "月額", ko: "월간", hi: "मासिक", es: "Mensual", fr: "Mensuel", de: "Monatlich", th: "รายเดือน", vi: "Hàng tháng", ar: "شهري", tl: "Buwanan", it: "Mensile", he: "חודשי" },
  daysLeft: { id: "hari tersisa", en: "days left", zh: "天剩余", ja: "日残り", ko: "일 남음", hi: "दिन शेष", es: "días restantes", fr: "jours restants", de: "Tage übrig", th: "วันที่เหลือ", vi: "ngày còn lại", ar: "أيام متبقية", tl: "araw na natitira", it: "giorni rimanenti", he: "ימים נותרו" },
  creditsAvailable: { id: "kredit tersedia", en: "credits available", zh: "额度可用", ja: "クレジット利用可能", ko: "크레딧 사용 가능", hi: "क्रेडिट उपलब्ध", es: "créditos disponibles", fr: "crédits disponibles", de: "Guthaben verfügbar", th: "เครดิตที่ใช้ได้", vi: "tín dụng khả dụng", ar: "رصيد متاح", tl: "credit na magagamit", it: "crediti disponibili", he: "נקודות זמינות" },
  used: { id: "terpakai", en: "used", zh: "已用", ja: "使用済み", ko: "사용됨", hi: "उपयोग किया गया", es: "usado", fr: "utilisé", de: "verbraucht", th: "ใช้ไปแล้ว", vi: "đã dùng", ar: "مستخدَم", tl: "nagamit na", it: "utilizzati", he: "נוצלו" },
  premiumTitle: {
    id: "Fitur premium berbayar", en: "Premium usable features", zh: "高级付费功能", ja: "プレミアム機能",
    ko: "프리미엄 유료 기능", hi: "प्रीमियम सशुल्क सुविधाएं", es: "Funciones premium de pago", fr: "Fonctionnalités premium payantes",
    de: "Kostenpflichtige Premium-Funktionen", th: "ฟีเจอร์พรีเมียมแบบเสียเครดิต", vi: "Tính năng cao cấp có phí", ar: "الميزات المميزة المدفوعة",
    tl: "Mga premium na feature", it: "Funzionalità premium a pagamento", he: "תכונות פרימיום בתשלום",
  },
  premiumDesc: {
    id: "Tiga fitur ini memakai layanan AI, jadi setiap pemakaian memotong kredit. Menulis, mengedit, lampiran, preview, ekspor dan berbagi selalu gratis. Kalau kredit habis, Anda tetap bisa memakai Magic Talk secara manual — tinggal top up kapan pun butuh AI lagi.",
    en: "These three features call AI services, so each use spends credits. Writing, editing, attachments, preview, export and sharing are always free. When your credits run out you can keep using Magic Talk manually — just top up whenever you need AI again.",
    zh: "这三项功能会调用 AI 服务，每次使用都会消耗额度。撰写、编辑、附件、预览、导出和分享始终免费。额度用完后仍可手动使用 Magic Talk —— 需要 AI 时再充值即可。",
    ja: "この 3 つの機能は AI サービスを呼び出すため、利用のたびにクレジットを消費します。作成・編集・添付・プレビュー・書き出し・共有は常に無料です。クレジットがなくなっても手動で Magic Talk を使い続けられます。AI が必要になったらいつでもチャージしてください。",
    ko: "이 세 가지 기능은 AI 서비스를 호출하므로 사용할 때마다 크레딧이 소모됩니다. 작성, 편집, 첨부, 미리보기, 내보내기, 공유는 항상 무료입니다. 크레딧이 떨어져도 Magic Talk를 수동으로 계속 사용할 수 있으며, AI가 다시 필요할 때 충전하면 됩니다.",
    hi: "ये तीन सुविधाएं AI सेवाओं का उपयोग करती हैं, इसलिए हर उपयोग पर क्रेडिट खर्च होता है। लिखना, संपादन, अटैचमेंट, प्रीव्यू, एक्सपोर्ट और शेयरिंग हमेशा मुफ़्त हैं। क्रेडिट समाप्त होने पर भी आप Magic Talk का मैन्युअल उपयोग जारी रख सकते हैं — जब भी AI चाहिए, टॉप अप कर लें।",
    es: "Estas tres funciones usan servicios de IA, por lo que cada uso gasta créditos. Escribir, editar, adjuntos, vista previa, exportar y compartir son siempre gratis. Cuando se agoten sus créditos, puede seguir usando Magic Talk manualmente — solo recargue cuando necesite IA de nuevo.",
    fr: "Ces trois fonctionnalités font appel à des services d'IA, donc chaque utilisation consomme des crédits. Écrire, modifier, joindre, prévisualiser, exporter et partager sont toujours gratuits. Quand vos crédits sont épuisés, vous pouvez continuer à utiliser Magic Talk manuellement — rechargez dès que vous avez besoin de l'IA.",
    de: "Diese drei Funktionen nutzen KI-Dienste, daher kostet jede Nutzung Guthaben. Schreiben, Bearbeiten, Anhänge, Vorschau, Export und Teilen sind immer kostenlos. Wenn Ihr Guthaben aufgebraucht ist, können Sie Magic Talk weiterhin manuell nutzen — laden Sie einfach auf, wenn Sie wieder KI benötigen.",
    th: "ฟีเจอร์ทั้งสามนี้เรียกใช้บริการ AI ดังนั้นการใช้งานแต่ละครั้งจะหักเครดิต การเขียน แก้ไข แนบไฟล์ พรีวิว ส่งออก และแชร์ ฟรีเสมอ เมื่อเครดิตหมด คุณยังใช้ Magic Talk แบบแมนนวลได้ — แค่เติมเครดิตเมื่อต้องการ AI อีกครั้ง",
    vi: "Ba tính năng này gọi dịch vụ AI nên mỗi lần dùng sẽ tốn tín dụng. Viết, chỉnh sửa, đính kèm, xem trước, xuất và chia sẻ luôn miễn phí. Khi hết tín dụng, bạn vẫn có thể dùng Magic Talk thủ công — chỉ cần nạp thêm khi cần AI.",
    ar: "تستدعي هذه الميزات الثلاث خدمات الذكاء الاصطناعي، لذا يستهلك كل استخدام رصيدًا. الكتابة والتحرير والمرفقات والمعاينة والتصدير والمشاركة مجانية دائمًا. عند نفاد رصيدك يمكنك متابعة استخدام Magic Talk يدويًا — فقط اشحن الرصيد كلما احتجت الذكاء الاصطناعي مجددًا.",
    tl: "Ang tatlong feature na ito ay gumagamit ng serbisyo ng AI, kaya ang bawat paggamit ay gumagastos ng credit. Ang pagsulat, pag-edit, attachment, preview, export at pagbahagi ay palaging libre. Kapag naubos ang iyong credit, maaari ka pa ring gumamit ng Magic Talk nang manu-mano — mag-top up lang kapag kailangan mo ulit ng AI.",
    it: "Queste tre funzionalità richiamano servizi IA, quindi ogni utilizzo consuma crediti. Scrivere, modificare, allegati, anteprima, esportazione e condivisione sono sempre gratuiti. Quando i crediti finiscono, puoi continuare a usare Magic Talk manualmente — ricarica quando hai di nuovo bisogno dell'IA.",
    he: "שלוש התכונות הללו קוראות לשירותי בינה מלאכותית, כך שכל שימוש עולה נקודות. כתיבה, עריכה, קבצים מצורפים, תצוגה מקדימה, ייצוא ושיתוף תמיד חינם. כשהנקודות שלך נגמרות, תוכל להמשיך להשתמש ב-Magic Talk ידנית — פשוט טען מחדש כשתזדקק שוב לבינה מלאכותית.",
  },
  transcribeLabel: { id: "Transcribe", en: "Transcribe", zh: "转录", ja: "文字起こし", ko: "받아쓰기", hi: "Transcribe", es: "Transcribir", fr: "Transcrire", de: "Transkribieren", th: "ถอดเสียง", vi: "Phiên âm", ar: "تفريغ", tl: "Transcribe", it: "Trascrivi", he: "תמלול" },
  perMinute: { id: "kredit / menit", en: "credits / minute", zh: "额度 / 分钟", ja: "クレジット / 分", ko: "크레딧 / 분", hi: "क्रेडिट / मिनट", es: "créditos / minuto", fr: "crédits / minute", de: "Guthaben / Minute", th: "เครดิต / นาที", vi: "tín dụng / phút", ar: "رصيد / دقيقة", tl: "credit / minuto", it: "crediti / minuto", he: "נקודות / דקה" },
  translateLabel: { id: "Translate", en: "Translate", zh: "翻译", ja: "翻訳", ko: "번역", hi: "Translate", es: "Traducir", fr: "Traduire", de: "Übersetzen", th: "แปลภาษา", vi: "Dịch", ar: "ترجمة", tl: "Translate", it: "Traduci", he: "תרגום" },
  per1k: { id: "kredit / 1000 karakter", en: "credits / 1000 characters", zh: "额度 / 1000 字符", ja: "クレジット / 1000文字", ko: "크레딧 / 1000자", hi: "क्रेडिट / 1000 वर्ण", es: "créditos / 1000 caracteres", fr: "crédits / 1000 caractères", de: "Guthaben / 1000 Zeichen", th: "เครดิต / 1000 ตัวอักษร", vi: "tín dụng / 1000 ký tự", ar: "رصيد / 1000 حرف", tl: "credit / 1000 karakter", it: "crediti / 1000 caratteri", he: "נקודות / 1000 תווים" },
  captionLabel: { id: "Caption Foto", en: "Caption Picture", zh: "图片配文", ja: "画像キャプション", ko: "사진 캡션", hi: "फ़ोटो कैप्शन", es: "Subtítulo de foto", fr: "Légende photo", de: "Bildunterschrift", th: "คำบรรยายภาพ", vi: "Chú thích ảnh", ar: "تعليق الصورة", tl: "Caption ng Larawan", it: "Didascalia Foto", he: "כיתוב תמונה" },
  captionSuffix: { id: "(caption AI)", en: "(AI caption)", zh: "（AI 配文）", ja: "（AI キャプション）", ko: "(AI 캡션)", hi: "(AI कैप्शन)", es: "(subtítulo IA)", fr: "(légende IA)", de: "(KI-Bildunterschrift)", th: "(คำบรรยาย AI)", vi: "(chú thích AI)", ar: "(تعليق بالذكاء الاصطناعي)", tl: "(AI caption)", it: "(didascalia IA)", he: "(כיתוב בינה מלאכותית)" },
  perPicture: { id: "kredit / gambar", en: "credits / picture", zh: "额度 / 张", ja: "クレジット / 枚", ko: "크레딧 / 사진", hi: "क्रेडिट / तस्वीर", es: "créditos / foto", fr: "crédits / photo", de: "Guthaben / Bild", th: "เครดิต / รูป", vi: "tín dụng / ảnh", ar: "رصيد / صورة", tl: "credit / larawan", it: "crediti / foto", he: "נקודות / תמונה" },
  subscriptionTab: { id: "Langganan", en: "Subscription", zh: "订阅", ja: "定期購入", ko: "구독", hi: "सब्सक्रिप्शन", es: "Suscripción", fr: "Abonnement", de: "Abonnement", th: "การสมัครสมาชิก", vi: "Gói đăng ký", ar: "الاشتراك", tl: "Subscription", it: "Abbonamento", he: "מנוי" },
  creditsTab: { id: "Beli Kredit", en: "Buy credits", zh: "购买额度", ja: "クレジット購入", ko: "크레딧 구매", hi: "क्रेडिट खरीदें", es: "Comprar créditos", fr: "Acheter des crédits", de: "Guthaben kaufen", th: "ซื้อเครดิต", vi: "Mua tín dụng", ar: "شراء رصيد", tl: "Bumili ng credit", it: "Acquista crediti", he: "רכישת נקודות" },
  priceVersion: { id: "Versi Harga", en: "Price version", zh: "价格版本", ja: "料金プラン", ko: "가격 버전", hi: "मूल्य संस्करण", es: "Versión de precio", fr: "Version tarifaire", de: "Preisversion", th: "รูปแบบราคา", vi: "Phiên bản giá", ar: "إصدار السعر", tl: "Bersyon ng presyo", it: "Versione prezzo", he: "גרסת מחיר" },
  days30: { id: "30 Hari", en: "30 Days", zh: "30 天", ja: "30日間", ko: "30일", hi: "30 दिन", es: "30 días", fr: "30 jours", de: "30 Tage", th: "30 วัน", vi: "30 ngày", ar: "30 يومًا", tl: "30 Araw", it: "30 Giorni", he: "30 ימים" },
  year1: { id: "1 Tahun", en: "1 Year", zh: "1 年", ja: "1年間", ko: "1년", hi: "1 वर्ष", es: "1 año", fr: "1 an", de: "1 Jahr", th: "1 ปี", vi: "1 năm", ar: "سنة واحدة", tl: "1 Taon", it: "1 Anno", he: "שנה אחת" },
  monthlyDesc: { id: "Akses penuh satu bulan", en: "One month of full access", zh: "一个月完整使用权", ja: "1か月間フルアクセス", ko: "1개월 전체 이용", hi: "एक महीने की पूर्ण पहुंच", es: "Un mes de acceso completo", fr: "Un mois d'accès complet", de: "Ein Monat voller Zugriff", th: "เข้าใช้งานเต็มรูปแบบ 1 เดือน", vi: "Truy cập đầy đủ trong một tháng", ar: "شهر واحد من الوصول الكامل", tl: "Isang buwan ng buong access", it: "Un mese di accesso completo", he: "חודש אחד של גישה מלאה" },
  yearlyDesc: { id: "Paling hemat — 12 bulan", en: "Best value — 12 months", zh: "最划算 —— 12 个月", ja: "お得 — 12か月", ko: "최고 가치 — 12개월", hi: "सर्वश्रेष्ठ मूल्य — 12 महीने", es: "Mejor valor: 12 meses", fr: "Meilleure offre — 12 mois", de: "Bester Wert — 12 Monate", th: "คุ้มค่าที่สุด — 12 เดือน", vi: "Giá trị tốt nhất — 12 tháng", ar: "أفضل قيمة — 12 شهرًا", tl: "Pinakasulit — 12 buwan", it: "Miglior valore — 12 mesi", he: "השווי הטוב ביותר — 12 חודשים" },
  creditPackages: { id: "Paket Kredit", en: "Credit packages", zh: "额度套餐", ja: "クレジットパッケージ", ko: "크레딧 패키지", hi: "क्रेडिट पैकेज", es: "Paquetes de créditos", fr: "Forfaits de crédits", de: "Guthabenpakete", th: "แพ็กเกจเครดิต", vi: "Gói tín dụng", ar: "باقات الرصيد", tl: "Mga Pakete ng Credit", it: "Pacchetti di crediti", he: "חבילות נקודות" },
  creditsWord: { id: "kredit", en: "credits", zh: "额度", ja: "クレジット", ko: "크레딧", hi: "क्रेडिट", es: "créditos", fr: "crédits", de: "Guthaben", th: "เครดิต", vi: "tín dụng", ar: "رصيد", tl: "credit", it: "crediti", he: "נקודות" },
  neverExpire: {
    id: "Kredit tidak pernah kedaluwarsa dan bisa di-top up kapan saja, bahkan saat langganan Anda masih aktif.",
    en: "Credits never expire and can be topped up anytime, even while your subscription is still running.",
    zh: "额度永不过期，可随时充值，即使您的订阅仍在有效期内也可以充值。",
    ja: "クレジットは失効しません。サブスクリプションが有効な間でも、いつでもチャージできます。",
    ko: "크레딧은 만료되지 않으며 구독이 활성 상태인 동안에도 언제든지 충전할 수 있습니다.",
    hi: "क्रेडिट कभी समाप्त नहीं होते और इन्हें कभी भी टॉप अप किया जा सकता है, भले ही आपकी सब्सक्रिप्शन अभी भी सक्रिय हो।",
    es: "Los créditos nunca caducan y se pueden recargar en cualquier momento, incluso mientras su suscripción sigue activa.",
    fr: "Les crédits n'expirent jamais et peuvent être rechargés à tout moment, même pendant que votre abonnement est actif.",
    de: "Guthaben verfällt nie und kann jederzeit aufgeladen werden, auch während Ihr Abonnement noch aktiv ist.",
    th: "เครดิตไม่มีวันหมดอายุและสามารถเติมได้ทุกเมื่อ แม้ในขณะที่การสมัครสมาชิกของคุณยังใช้งานอยู่",
    vi: "Tín dụng không bao giờ hết hạn và có thể nạp thêm bất cứ lúc nào, ngay cả khi gói đăng ký của bạn vẫn đang hoạt động.",
    ar: "لا تنتهي صلاحية الرصيد أبدًا ويمكن شحنه في أي وقت، حتى أثناء استمرار اشتراكك.",
    tl: "Ang mga credit ay hindi kailanman nag-e-expire at maaaring i-top up anumang oras, kahit habang aktibo pa ang iyong subscription.",
    it: "I crediti non scadono mai e possono essere ricaricati in qualsiasi momento, anche mentre il tuo abbonamento è ancora attivo.",
    he: "נקודות לעולם אינן פגות תוקף וניתן לטעון אותן מחדש בכל עת, גם בזמן שהמנוי שלך עדיין פעיל.",
  },
  payWithQris: { id: "Bayar dengan QRIS", en: "Pay with QRIS", zh: "使用 QRIS 支付", ja: "QRIS で支払う", ko: "QRIS로 결제", hi: "QRIS से भुगतान करें", es: "Pagar con QRIS", fr: "Payer avec QRIS", de: "Mit QRIS bezahlen", th: "ชำระด้วย QRIS", vi: "Thanh toán bằng QRIS", ar: "الدفع عبر QRIS", tl: "Magbayad gamit ang QRIS", it: "Paga con QRIS", he: "שלם עם QRIS" },
  qrisNotUploaded: {
    id: "Kode QRIS belum diunggah.", en: "The QRIS code has not been uploaded yet.", zh: "尚未上传 QRIS 码。", ja: "QRIS コードはまだアップロードされていません。",
    ko: "QRIS 코드가 아직 업로드되지 않았습니다.", hi: "QRIS कोड अभी अपलोड नहीं किया गया है।", es: "Aún no se ha subido el código QRIS.", fr: "Le code QRIS n'a pas encore été téléchargé.",
    de: "Der QRIS-Code wurde noch nicht hochgeladen.", th: "ยังไม่ได้อัปโหลดโค้ด QRIS", vi: "Mã QRIS chưa được tải lên.", ar: "لم يتم رفع رمز QRIS بعد.",
    tl: "Hindi pa na-upload ang QRIS code.", it: "Il codice QRIS non è stato ancora caricato.", he: "קוד ה-QRIS עדיין לא הועלה.",
  },
  scanAndPayPrefix: { id: "Pindai dan bayar", en: "Scan and pay", zh: "扫描并支付", ja: "スキャンして支払う", ko: "스캔하고 결제", hi: "स्कैन करें और भुगतान करें", es: "Escanee y pague", fr: "Scannez et payez", de: "Scannen und bezahlen", th: "สแกนและชำระเงิน", vi: "Quét và thanh toán", ar: "امسح وادفع", tl: "I-scan at magbayad", it: "Scansiona e paga", he: "סרוק ושלם" },
  scanAndPaySuffix: {
    id: "lalu unggah bukti bayar di bawah.", en: "then upload your receipt below.", zh: "然后在下方上传付款凭证。", ja: "その後、下記から領収書をアップロードしてください。",
    ko: "그런 다음 아래에 영수증을 업로드하세요.", hi: "फिर नीचे अपनी रसीद अपलोड करें।", es: "luego suba su recibo abajo.", fr: "puis téléchargez votre reçu ci-dessous.",
    de: "und laden Sie unten Ihren Beleg hoch.", th: "จากนั้นอัปโหลดใบเสร็จของคุณด้านล่าง", vi: "sau đó tải lên biên lai của bạn bên dưới.", ar: "ثم ارفع إيصالك أدناه.",
    tl: "pagkatapos ay i-upload ang iyong resibo sa ibaba.", it: "poi carica la tua ricevuta qui sotto.", he: "ולאחר מכן העלה את הקבלה שלך למטה.",
  },
  yourDetails: { id: "Detail Anda", en: "Your details", zh: "您的信息", ja: "お客様情報", ko: "내 정보", hi: "आपका विवरण", es: "Sus datos", fr: "Vos coordonnées", de: "Ihre Angaben", th: "รายละเอียดของคุณ", vi: "Thông tin của bạn", ar: "بياناتك", tl: "Iyong mga detalye", it: "I tuoi dati", he: "הפרטים שלך" },
  fullName: { id: "Nama lengkap", en: "Full name", zh: "全名", ja: "氏名", ko: "이름", hi: "पूरा नाम", es: "Nombre completo", fr: "Nom complet", de: "Vollständiger Name", th: "ชื่อเต็ม", vi: "Họ và tên", ar: "الاسم الكامل", tl: "Buong pangalan", it: "Nome completo", he: "שם מלא" },
  whatsappNumber: { id: "Nomor WhatsApp", en: "WhatsApp number", zh: "WhatsApp 号码", ja: "WhatsApp 番号", ko: "WhatsApp 번호", hi: "WhatsApp नंबर", es: "Número de WhatsApp", fr: "Numéro WhatsApp", de: "WhatsApp-Nummer", th: "หมายเลข WhatsApp", vi: "Số WhatsApp", ar: "رقم واتساب", tl: "Numero ng WhatsApp", it: "Numero WhatsApp", he: "מספר וואטסאפ" },
  emailAddress: { id: "Alamat email", en: "Email address", zh: "电子邮件地址", ja: "メールアドレス", ko: "이메일 주소", hi: "ईमेल पता", es: "Correo electrónico", fr: "Adresse e-mail", de: "E-Mail-Adresse", th: "ที่อยู่อีเมล", vi: "Địa chỉ email", ar: "البريد الإلكتروني", tl: "Email address", it: "Indirizzo email", he: "כתובת דוא\"ל" },
  changeReceipt: { id: "Ganti bukti pembayaran", en: "Change payment receipt", zh: "更改付款凭证", ja: "領収書を変更", ko: "결제 영수증 변경", hi: "भुगतान रसीद बदलें", es: "Cambiar comprobante de pago", fr: "Modifier le reçu", de: "Zahlungsbeleg ändern", th: "เปลี่ยนใบเสร็จ", vi: "Đổi biên lai thanh toán", ar: "تغيير إيصال الدفع", tl: "Palitan ang resibo ng bayad", it: "Cambia ricevuta di pagamento", he: "שנה קבלת תשלום" },
  uploadReceipt: { id: "Unggah bukti pembayaran", en: "Upload payment receipt", zh: "上传付款凭证", ja: "領収書をアップロード", ko: "결제 영수증 업로드", hi: "भुगतान रसीद अपलोड करें", es: "Subir comprobante de pago", fr: "Télécharger le reçu", de: "Zahlungsbeleg hochladen", th: "อัปโหลดใบเสร็จ", vi: "Tải lên biên lai thanh toán", ar: "رفع إيصال الدفع", tl: "I-upload ang resibo ng bayad", it: "Carica ricevuta di pagamento", he: "העלה קבלת תשלום" },
  sendOrder: { id: "Kirim pesanan", en: "Send order", zh: "提交订单", ja: "注文を送信", ko: "주문 보내기", hi: "ऑर्डर भेजें", es: "Enviar pedido", fr: "Envoyer la commande", de: "Bestellung senden", th: "ส่งคำสั่งซื้อ", vi: "Gửi đơn hàng", ar: "إرسال الطلب", tl: "Ipadala ang order", it: "Invia ordine", he: "שלח הזמנה" },
  fillDetails: {
    id: "Mohon isi nama, nomor WhatsApp dan email Anda.", en: "Please fill in your name, WhatsApp number and email.", zh: "请填写您的姓名、WhatsApp 号码和电子邮件。", ja: "お名前、WhatsApp 番号、メールアドレスを入力してください。",
    ko: "이름, WhatsApp 번호, 이메일을 입력해 주세요.", hi: "कृपया अपना नाम, WhatsApp नंबर और ईमेल भरें।", es: "Complete su nombre, número de WhatsApp y correo electrónico.", fr: "Veuillez renseigner votre nom, numéro WhatsApp et e-mail.",
    de: "Bitte geben Sie Ihren Namen, Ihre WhatsApp-Nummer und E-Mail-Adresse ein.", th: "โปรดกรอกชื่อ หมายเลข WhatsApp และอีเมลของคุณ", vi: "Vui lòng điền tên, số WhatsApp và email của bạn.", ar: "يرجى إدخال اسمك ورقم واتساب وبريدك الإلكتروني.",
    tl: "Pakipuno ang iyong pangalan, numero ng WhatsApp at email.", it: "Compila il tuo nome, numero WhatsApp ed email.", he: "אנא מלא את שמך, מספר הוואטסאפ והדוא\"ל שלך.",
  },
  sendingOrder: { id: "Mengirim pesanan…", en: "Sending your order…", zh: "正在提交订单…", ja: "注文を送信中…", ko: "주문 전송 중…", hi: "आपका ऑर्डर भेजा जा रहा है…", es: "Enviando su pedido…", fr: "Envoi de votre commande…", de: "Ihre Bestellung wird gesendet…", th: "กำลังส่งคำสั่งซื้อของคุณ…", vi: "Đang gửi đơn hàng của bạn…", ar: "جارٍ إرسال طلبك…", tl: "Ipinapadala ang iyong order…", it: "Invio del tuo ordine…", he: "שולח את ההזמנה שלך…" },
  orderSentPrefix: { id: "Pesanan terkirim. ID pengguna Anda", en: "Order sent. Your user ID is", zh: "订单已发送。您的用户 ID 是", ja: "注文が送信されました。あなたのユーザーIDは", ko: "주문이 전송되었습니다. 사용자 ID는", hi: "ऑर्डर भेज दिया गया है। आपकी यूज़र ID है", es: "Pedido enviado. Su ID de usuario es", fr: "Commande envoyée. Votre identifiant utilisateur est", de: "Bestellung gesendet. Ihre Benutzer-ID lautet", th: "ส่งคำสั่งซื้อแล้ว รหัสผู้ใช้ของคุณคือ", vi: "Đã gửi đơn hàng. Mã người dùng của bạn là", ar: "تم إرسال الطلب. معرّف المستخدم الخاص بك هو", tl: "Naipadala ang order. Ang iyong user ID ay", it: "Ordine inviato. Il tuo ID utente è", he: "ההזמנה נשלחה. מזהה המשתמש שלך הוא" },
  orderSentSuffix: {
    id: "Kode voucher akan dikirimkan kepada Anda.", en: "The voucher code will be sent to you.", zh: "兑换码将发送给您。", ja: "バウチャーコードが送信されます。",
    ko: "바우처 코드가 전송됩니다.", hi: "वाउचर कोड आपको भेज दिया जाएगा।", es: "El código de vale se le enviará.", fr: "Le code du bon vous sera envoyé.",
    de: "Der Gutscheincode wird Ihnen zugesendet.", th: "รหัสวอเชอร์จะถูกส่งให้คุณ", vi: "Mã voucher sẽ được gửi cho bạn.", ar: "سيتم إرسال رمز القسيمة إليك.",
    tl: "Ipapadala sa iyo ang voucher code.", it: "Il codice del buono ti verrà inviato.", he: "קוד השובר יישלח אליך.",
  },
  orderFailed: { id: "Pesanan tidak dapat dikirim.", en: "Could not send the order.", zh: "无法提交订单。", ja: "注文を送信できませんでした。", ko: "주문을 보낼 수 없습니다.", hi: "ऑर्डर नहीं भेजा जा सका।", es: "No se pudo enviar el pedido.", fr: "Impossible d'envoyer la commande.", de: "Bestellung konnte nicht gesendet werden.", th: "ไม่สามารถส่งคำสั่งซื้อได้", vi: "Không thể gửi đơn hàng.", ar: "تعذّر إرسال الطلب.", tl: "Hindi maipadala ang order.", it: "Impossibile inviare l'ordine.", he: "לא ניתן היה לשלוח את ההזמנה." },
};


function useBT() {
  const { lang } = useLang();
  return (key: keyof typeof BT) => BT[key]?.[lang] ?? "";
}

function BuyPage() {
  const order = useServerFn(createOrder);
  const creditOrder = useServerFn(createCreditOrder);
  const qris = useServerFn(getQris);
  const status = useServerFn(getStatus);
  const pricingFn = useServerFn(getPricing);
  const t = useT();
  const bt = useBT();

  const [deviceId, setDeviceId] = useState("");
  const [tab, setTab] = useState<"plan" | "credits">("plan");
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [versionId, setVersionId] = useState<string>("");
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [packId, setPackId] = useState<string>("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [current, setCurrent] = useState<{
    plan: string;
    daysLeft: number;
    creditsBalance: number;
    creditsUsed: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);
    void qris().then((r) => setQrisUrl(r.url)).catch(() => undefined);
    void pricingFn()
      .then((p) => {
        setPricing(p);
        setVersionId((v) => v || (p.pricePlans[0]?.id ?? ""));
        setPackId((v) => v || (p.creditPacks[0]?.id ?? ""));
      })
      .catch(() => undefined);
    void status({ data: { deviceId: id } })
      .then((s) => {
        setCurrent({
          plan: s.plan,
          daysLeft: s.daysLeft,
          creditsBalance: s.creditsBalance,
          creditsUsed: s.creditsUsed,
        });
        setName((n) => n || s.name);
        setWhatsapp((w) => w || s.whatsapp);
        setEmail((e) => e || s.email);
      })
      .catch(() => undefined);
  }, [qris, status, pricingFn]);

  const label = "text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground";
  const field =
    "mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25";

  const version = pricing?.pricePlans.find((p) => p.id === versionId) ?? null;
  const pack = pricing?.creditPacks.find((p) => p.id === packId) ?? null;
  const payable =
    tab === "credits"
      ? (pack?.amount ?? 0)
      : version
        ? plan === "yearly"
          ? version.yearly
          : version.monthly
        : 0;

  const detailsOk = useCallback(
    () => !!(name.trim() && whatsapp.trim() && email.trim()),
    [name, whatsapp, email],
  );

  async function submitOrder() {
    if (!detailsOk()) {
      toast.error(bt("fillDetails"));
      return;
    }
    setBusy(bt("sendingOrder"));
    try {
      const res =
        tab === "credits"
          ? await creditOrder({
              data: {
                deviceId,
                name: name.trim(),
                whatsapp: whatsapp.trim(),
                email: email.trim(),
                packId,
                ...(receipt ? { receiptDataUrl: receipt } : {}),
              },
            })
          : await order({
              data: {
                deviceId,
                name: name.trim(),
                whatsapp: whatsapp.trim(),
                email: email.trim(),
                plan,
                ...(versionId ? { pricePlanId: versionId } : {}),
                ...(receipt ? { receiptDataUrl: receipt } : {}),
              },
            });
      toast.success(`${bt("orderSentPrefix")} ${res.userCode}. ${bt("orderSentSuffix")}`);
      setReceipt(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : bt("orderFailed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <Toaster position="top-center" />
      <header className="border-b border-border bg-card/70 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="size-4" /> {t("backToHome")}
          </Link>
          <LanguageSwitcher />
        </div>
        <h1 className="mt-2 text-3xl leading-none text-foreground">{bt("title")}</h1>
        {current && (
          <p className="mt-1 text-sm text-muted-foreground">
            {current.plan === "trial" ? bt("trial") : current.plan === "yearly" ? bt("annual") : bt("monthly")} ·{" "}
            {current.daysLeft} {bt("daysLeft")} · {current.creditsBalance} {bt("creditsAvailable")} (
            {current.creditsUsed} {bt("used")})
          </p>
        )}
      </header>

      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="size-4" /> {bt("premiumTitle")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{bt("premiumDesc")}</p>
          <ul className="mt-3 space-y-1.5 text-sm text-foreground">
            <li>
              • <strong>{bt("transcribeLabel")}</strong> (voice → text):{" "}
              {pricing ? `${pricing.creditCosts.transcribePerMinute} ${bt("perMinute")}` : "—"}
            </li>
            <li>
              • <strong>{bt("translateLabel")}</strong>:{" "}
              {pricing ? `${pricing.creditCosts.translatePer1kChars} ${bt("per1k")}` : "—"}
            </li>
            <li>
              • <strong>{bt("captionLabel")}</strong> {bt("captionSuffix")}:{" "}
              {pricing ? `${pricing.creditCosts.captionPerPicture} ${bt("perPicture")}` : "—"}
            </li>
          </ul>
        </section>

        <div className="grid grid-cols-2 gap-2">
          {(["plan", "credits"] as const).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`rounded-md border px-4 py-2 text-sm font-semibold ${
                tab === tb ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground"
              }`}
            >
              {tb === "plan" ? bt("subscriptionTab") : bt("creditsTab")}
            </button>
          ))}
        </div>

        {tab === "plan" ? (
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className={label}>{bt("priceVersion")}</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {(pricing?.pricePlans ?? []).map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVersionId(v.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    versionId === v.id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(["monthly", "yearly"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setPlan(k)}
                  className={`rounded-xl border p-4 text-left transition ${
                    plan === k ? "border-primary bg-primary/5 ring-2 ring-ring/25" : "border-border bg-card"
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">{k === "monthly" ? bt("days30") : bt("year1")}</p>
                  <p className="mt-1 font-display text-2xl text-foreground">
                    {version ? formatIDR(k === "monthly" ? version.monthly : version.yearly) : "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {k === "monthly" ? bt("monthlyDesc") : bt("yearlyDesc")}
                  </p>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className={label}>{bt("creditPackages")}</span>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {(pricing?.creditPacks ?? []).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPackId(p.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    packId === p.id ? "border-primary bg-primary/5 ring-2 ring-ring/25" : "border-border bg-card"
                  }`}
                >
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Coins className="size-4" /> {p.credits} {bt("creditsWord")}
                  </p>
                  <p className="mt-1 font-display text-xl text-foreground">{formatIDR(p.amount)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{p.label}</p>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{bt("neverExpire")}</p>
          </section>
        )}

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className={label}>{bt("payWithQris")}</span>
          <div className="mt-3 flex justify-center">
            {qrisUrl ? (
              <img src={qrisUrl} alt="QRIS payment code" className="max-h-72 rounded-lg border border-border" />
            ) : (
              <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <QrCode className="size-4" /> {bt("qrisNotUploaded")}
              </p>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {bt("scanAndPayPrefix")} {formatIDR(payable)}, {bt("scanAndPaySuffix")}
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className={label}>{bt("yourDetails")}</span>
          <div className="mt-1">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={bt("fullName")} className={field} />
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder={bt("whatsappNumber")}
              className={field}
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={bt("emailAddress")}
              className={field}
            />
          </div>

          <button
            onClick={() => fileRef.current?.click()}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium"
          >
            <Upload className="size-4" /> {receipt ? bt("changeReceipt") : bt("uploadReceipt")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only absolute size-px opacity-0"
            onChange={(e) => {
              const input = e.currentTarget;
              const file = input.files?.[0];
              if (!file) return;
              void fileToDataUrl(file)
                .then(setReceipt)
                .finally(() => {
                  input.value = "";
                });
            }}
          />
          {receipt && (
            <img src={receipt} alt="Payment receipt preview" className="mt-3 max-h-56 rounded-lg border border-border" />
          )}

          <button
            onClick={submitOrder}
            disabled={!!busy}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <CheckCircle2 className="size-4" /> {bt("sendOrder")}
          </button>
        </section>
      </div>

      {busy && (
        <div className="fixed inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">
          <Loader2 className="size-4 animate-spin" /> {busy}
        </div>
      )}
    </main>
  );
}
