import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useLang, useT, type Lang } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Magic Talk" },
      { name: "description", content: "Terms and conditions for using Magic Talk." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TermsPage,
});

type LText = Record<Lang, string>;

const pageTitle: LText = {
  id: "Syarat & Ketentuan",
  en: "Terms & Conditions",
  zh: "条款与条件",
  ja: "利用規約",
  ko: "이용약관",
  hi: "नियम एवं शर्तें",
  es: "Términos y Condiciones",
  fr: "Conditions Générales",
  de: "Allgemeine Geschäftsbedingungen",
  th: "ข้อกำหนดและเงื่อนไข",
  vi: "Điều khoản & Điều kiện",
  ar: "الشروط والأحكام",
  tl: "Mga Tuntunin at Kundisyon",
  it: "Termini e Condizioni",
  he: "תנאים והגבלות",
};

const sections: { title: LText; body: LText }[] = [
  {
    title: {
      id: "1. Layanan", en: "1. The service", zh: "1. 服务", ja: "1. サービス", ko: "1. 서비스",
      hi: "1. सेवा", es: "1. El servicio", fr: "1. Le service", de: "1. Der Dienst", th: "1. บริการ",
      vi: "1. Dịch vụ", ar: "1. الخدمة", tl: "1. Ang serbisyo", it: "1. Il servizio", he: "1. השירות",
    },
    body: {
      id: "Magic Talk memungkinkan Anda merekam, mentranskrip, menerjemahkan dan mengirim memo, dengan bantuan AI opsional untuk transkripsi, terjemahan dan caption foto. Beberapa fitur disediakan oleh layanan AI pihak ketiga.",
      en: "Magic Talk lets you record, transcribe, translate and send memos, with optional AI-assisted transcription, translation and photo captioning. Some features are provided by third-party AI services.",
      zh: "Magic Talk 让您录音、转录、翻译并发送备忘录，并可选用 AI 辅助转录、翻译和照片配文。部分功能由第三方 AI 服务提供。",
      ja: "Magic Talk では、メモの録音・文字起こし・翻訳・送信ができ、AI による文字起こし、翻訳、写真のキャプション作成をオプションで利用できます。一部の機能は第三者の AI サービスによって提供されています。",
      ko: "Magic Talk를 사용하면 메모를 녹음, 받아쓰기, 번역 및 전송할 수 있으며, AI 지원 받아쓰기, 번역, 사진 캡션 기능을 선택적으로 사용할 수 있습니다. 일부 기능은 제3자 AI 서비스에서 제공됩니다.",
      hi: "Magic Talk आपको मेमो रिकॉर्ड करने, ट्रांसक्राइब करने, अनुवाद करने और भेजने की सुविधा देता है, साथ ही वैकल्पिक AI-सहायता प्राप्त ट्रांसक्रिप्शन, अनुवाद और फ़ोटो कैप्शनिंग भी। कुछ सुविधाएं तृतीय-पक्ष AI सेवाओं द्वारा प्रदान की जाती हैं।",
      es: "Magic Talk le permite grabar, transcribir, traducir y enviar memos, con transcripción, traducción y subtitulado de fotos asistidos por IA de forma opcional. Algunas funciones son proporcionadas por servicios de IA de terceros.",
      fr: "Magic Talk vous permet d'enregistrer, de transcrire, de traduire et d'envoyer des mémos, avec une transcription, une traduction et un sous-titrage de photos assistés par IA en option. Certaines fonctionnalités sont fournies par des services d'IA tiers.",
      de: "Mit Magic Talk können Sie Memos aufnehmen, transkribieren, übersetzen und senden, mit optionaler KI-gestützter Transkription, Übersetzung und Foto-Bildunterschriften. Einige Funktionen werden von KI-Diensten Dritter bereitgestellt.",
      th: "Magic Talk ให้คุณบันทึกเสียง ถอดเสียง แปล และส่งบันทึกได้ พร้อมตัวเลือกการถอดเสียง แปล และใส่คำบรรยายภาพด้วย AI บางฟีเจอร์ให้บริการโดยบริการ AI จากบุคคลที่สาม",
      vi: "Magic Talk cho phép bạn ghi âm, phiên âm, dịch và gửi ghi chú, với tùy chọn hỗ trợ AI cho phiên âm, dịch thuật và chú thích ảnh. Một số tính năng được cung cấp bởi dịch vụ AI của bên thứ ba.",
      ar: "يتيح لك Magic Talk تسجيل المذكرات وتفريغها وترجمتها وإرسالها، مع إمكانية استخدام الذكاء الاصطناعي اختياريًا للتفريغ والترجمة ووصف الصور. بعض الميزات مُقدَّمة من خدمات ذكاء اصطناعي تابعة لجهات خارجية.",
      tl: "Hinahayaan ka ng Magic Talk na mag-record, mag-transcribe, magsalin, at magpadala ng mga memo, na may opsyonal na AI-assisted na transcription, pagsasalin, at pag-caption ng larawan. Ang ilang feature ay ibinibigay ng mga third-party na serbisyo ng AI.",
      it: "Magic Talk ti permette di registrare, trascrivere, tradurre e inviare memo, con trascrizione, traduzione e didascalie foto assistite da IA opzionali. Alcune funzionalità sono fornite da servizi IA di terze parti.",
      he: "Magic Talk מאפשר לך להקליט, לתמלל, לתרגם ולשלוח תזכירים, עם תמלול, תרגום וכיתוב תמונות בעזרת בינה מלאכותית באופן אופציונלי. חלק מהתכונות מסופקות על ידי שירותי בינה מלאכותית של צד שלישי.",
    },
  },
  {
    title: {
      id: "2. Langganan dan voucher", en: "2. Subscriptions and vouchers", zh: "2. 订阅与兑换码", ja: "2. 定期購入とバウチャー",
      ko: "2. 구독 및 바우처", hi: "2. सब्सक्रिप्शन और वाउचर", es: "2. Suscripciones y vales", fr: "2. Abonnements et bons",
      de: "2. Abonnements und Gutscheine", th: "2. การสมัครสมาชิกและวอเชอร์", vi: "2. Gói đăng ký và voucher", ar: "2. الاشتراكات والقسائم",
      tl: "2. Mga subscription at voucher", it: "2. Abbonamenti e buoni", he: "2. מנויים ושוברים",
    },
    body: {
      id: "Akses di luar masa trial membutuhkan langganan aktif (bulanan atau tahunan) yang dibeli lewat pembayaran QRIS dan dikonfirmasi manual oleh admin, atau diaktifkan lewat kode voucher yang valid. Satu voucher hanya bisa diaktifkan di satu perangkat.",
      en: "Access beyond the trial period requires an active subscription (monthly or yearly) purchased via QRIS payment and confirmed manually by the admin, or activated using a valid voucher code. A voucher can only be activated on one device.",
      zh: "试用期结束后需要有效订阅（月付或年付），通过 QRIS 支付购买并由管理员手动确认，或使用有效的兑换码激活。每个兑换码只能在一台设备上激活。",
      ja: "試用期間を超えてご利用いただくには、QRIS 決済で購入し管理者が手動で確認する有効なサブスクリプション（月額または年額）、または有効なバウチャーコードでの有効化が必要です。バウチャーは 1 台の端末でのみ有効化できます。",
      ko: "체험 기간 이후 이용하려면 QRIS 결제로 구매 후 관리자가 수동으로 확인하는 활성 구독(월간 또는 연간)이 필요하거나, 유효한 바우처 코드로 활성화해야 합니다. 바우처는 하나의 기기에서만 활성화할 수 있습니다.",
      hi: "ट्रायल अवधि के बाद उपयोग के लिए सक्रिय सब्सक्रिप्शन (मासिक या वार्षिक) आवश्यक है, जिसे QRIS भुगतान से खरीदा जाता है और एडमिन द्वारा मैन्युअल रूप से पुष्टि की जाती है, या किसी वैध वाउचर कोड से सक्रिय किया जाता है। एक वाउचर केवल एक डिवाइस पर सक्रिय किया जा सकता है।",
      es: "El acceso más allá del período de prueba requiere una suscripción activa (mensual o anual) comprada mediante pago QRIS y confirmada manualmente por el administrador, o activada con un código de vale válido. Un vale solo puede activarse en un dispositivo.",
      fr: "L'accès au-delà de la période d'essai nécessite un abonnement actif (mensuel ou annuel) acheté par paiement QRIS et confirmé manuellement par l'administrateur, ou activé à l'aide d'un code bon valide. Un bon ne peut être activé que sur un seul appareil.",
      de: "Der Zugriff über den Testzeitraum hinaus erfordert ein aktives Abonnement (monatlich oder jährlich), das per QRIS-Zahlung gekauft und manuell vom Administrator bestätigt wird, oder die Aktivierung mit einem gültigen Gutscheincode. Ein Gutschein kann nur auf einem Gerät aktiviert werden.",
      th: "การเข้าใช้งานหลังหมดช่วงทดลองใช้ต้องมีการสมัครสมาชิกที่ใช้งานอยู่ (รายเดือนหรือรายปี) ที่ซื้อผ่านการชำระเงิน QRIS และได้รับการยืนยันด้วยตนเองโดยผู้ดูแลระบบ หรือเปิดใช้งานด้วยรหัสวอเชอร์ที่ถูกต้อง วอเชอร์หนึ่งใบสามารถเปิดใช้งานได้เพียงหนึ่งอุปกรณ์เท่านั้น",
      vi: "Truy cập ngoài thời gian dùng thử yêu cầu gói đăng ký đang hoạt động (hàng tháng hoặc hàng năm) được mua qua thanh toán QRIS và được quản trị viên xác nhận thủ công, hoặc kích hoạt bằng mã voucher hợp lệ. Một voucher chỉ có thể kích hoạt trên một thiết bị.",
      ar: "يتطلب الوصول بعد فترة التجربة اشتراكًا نشطًا (شهريًا أو سنويًا) يتم شراؤه عبر الدفع بواسطة QRIS ويؤكده المسؤول يدويًا، أو تفعيله باستخدام رمز قسيمة صالح. لا يمكن تفعيل القسيمة إلا على جهاز واحد.",
      tl: "Ang access lampas sa panahon ng pagsubok ay nangangailangan ng aktibong subscription (buwanan o taunan) na binili sa pamamagitan ng bayad na QRIS at kinumpirma nang manu-mano ng admin, o na-activate gamit ang wastong voucher code. Isang voucher lang ang maaaring i-activate sa isang device.",
      it: "L'accesso oltre il periodo di prova richiede un abbonamento attivo (mensile o annuale) acquistato tramite pagamento QRIS e confermato manualmente dall'amministratore, oppure attivato con un codice buono valido. Un buono può essere attivato solo su un dispositivo.",
      he: "גישה מעבר לתקופת הניסיון מחייבת מנוי פעיל (חודשי או שנתי) שנרכש בתשלום QRIS ואושר ידנית על ידי המנהל, או הופעל באמצעות קוד שובר תקף. ניתן להפעיל שובר במכשיר אחד בלבד.",
    },
  },
  {
    title: {
      id: "3. Kredit", en: "3. Credits", zh: "3. 额度", ja: "3. クレジット", ko: "3. 크레딧",
      hi: "3. क्रेडिट", es: "3. Créditos", fr: "3. Crédits", de: "3. Guthaben", th: "3. เครดิต",
      vi: "3. Tín dụng", ar: "3. الرصيد", tl: "3. Mga Credit", it: "3. Crediti", he: "3. נקודות",
    },
    body: {
      id: "Transcribe, Translate dan Auto-caption memakai AI dan memotong kredit dari saldo Anda. Tarif kredit dan harga paket top-up bisa berubah sewaktu-waktu. Kredit tidak dapat dikembalikan setelah terpakai, dan kredit yang belum terpakai tidak kedaluwarsa kecuali dinyatakan lain.",
      en: "Transcribe, Translate and Auto-caption use AI and consume credit from your balance. Credit rates and top-up package prices may change at any time. Credits are non-refundable once consumed, and unused credits do not expire unless stated otherwise.",
      zh: "转录、翻译和自动配文都会使用 AI 并从您的余额中扣除额度。额度费率和充值套餐价格可能随时变动。额度一经使用概不退还，未使用的额度除非另有说明否则不会过期。",
      ja: "文字起こし・翻訳・自動キャプションは AI を使用し、残高からクレジットを消費します。クレジットの料金やチャージパッケージの価格は予告なく変更される場合があります。消費されたクレジットは返金されません。未使用のクレジットは特に明記されない限り失効しません。",
      ko: "받아쓰기, 번역, 자동 캡션은 AI를 사용하며 잔액에서 크레딧을 소모합니다. 크레딧 요율과 충전 패키지 가격은 언제든지 변경될 수 있습니다. 소모된 크레딧은 환불되지 않으며, 별도 명시가 없는 한 미사용 크레딧은 만료되지 않습니다.",
      es: "Transcribir, Traducir y Auto-caption usan IA y consumen créditos de su saldo. Las tarifas de crédito y los precios de los paquetes de recarga pueden cambiar en cualquier momento. Los créditos no son reembolsables una vez consumidos, y los créditos no utilizados no caducan salvo que se indique lo contrario.",
      fr: "Transcrire, Traduire et Auto-légende utilisent l'IA et consomment des crédits de votre solde. Les tarifs des crédits et les prix des forfaits de recharge peuvent changer à tout moment. Les crédits ne sont pas remboursables une fois consommés, et les crédits inutilisés n'expirent pas sauf indication contraire.",
      de: "Transkribieren, Übersetzen und Auto-Bildunterschrift nutzen KI und verbrauchen Guthaben von Ihrem Kontostand. Guthabensätze und Preise für Aufladepakete können sich jederzeit ändern. Verbrauchtes Guthaben ist nicht erstattungsfähig, und ungenutztes Guthaben verfällt nicht, sofern nicht anders angegeben.",
      th: "Transcribe, Translate และ Auto-caption ใช้ AI และหักเครดิตจากยอดคงเหลือของคุณ อัตราเครดิตและราคาแพ็กเกจเติมเงินอาจเปลี่ยนแปลงได้ตลอดเวลา เครดิตที่ใช้ไปแล้วไม่สามารถขอคืนได้ และเครดิตที่ไม่ได้ใช้จะไม่หมดอายุเว้นแต่จะระบุไว้เป็นอย่างอื่น",
      vi: "Transcribe, Translate và Auto-caption dùng AI và tiêu tốn tín dụng từ số dư của bạn. Mức tín dụng và giá gói nạp có thể thay đổi bất cứ lúc nào. Tín dụng đã tiêu không được hoàn lại, và tín dụng chưa dùng không hết hạn trừ khi có quy định khác.",
      ar: "تستخدم ميزات التفريغ والترجمة والتعليق التلقائي الذكاء الاصطناعي وتستهلك رصيدًا من حسابك. قد تتغير أسعار الرصيد وأسعار باقات الشحن في أي وقت. الرصيد المستهلك غير قابل للاسترداد، والرصيد غير المستخدم لا تنتهي صلاحيته ما لم يُذكر خلاف ذلك.",
      hi: "Transcribe, Translate और Auto-caption AI का उपयोग करते हैं और आपके बैलेंस से क्रेडिट खर्च करते हैं। क्रेडिट दरें और टॉप-अप पैकेज की कीमतें कभी भी बदल सकती हैं। एक बार खर्च होने के बाद क्रेडिट वापस नहीं किए जा सकते, और अप्रयुक्त क्रेडिट तब तक समाप्त नहीं होते जब तक अन्यथा न बताया जाए।",
      tl: "Gumagamit ng AI ang Transcribe, Translate at Auto-caption at gumagastos ng credit mula sa iyong balanse. Ang mga rate ng credit at presyo ng top-up package ay maaaring magbago anumang oras. Hindi na-rerefund ang mga credit kapag nagamit na, at ang mga hindi nagamit na credit ay hindi nag-e-expire maliban kung nakasaad iba.",
      it: "Trascrivi, Traduci e Auto-didascalia usano l'IA e consumano crediti dal tuo saldo. Le tariffe dei crediti e i prezzi dei pacchetti di ricarica possono cambiare in qualsiasi momento. I crediti non sono rimborsabili una volta consumati, e i crediti non utilizzati non scadono salvo diversa indicazione.",
      he: "תמלול, תרגום וכיתוב אוטומטי משתמשים בבינה מלאכותית וצורכים נקודות מהיתרה שלך. תעריפי הנקודות ומחירי חבילות הטעינה עשויים להשתנות בכל עת. נקודות שנצרכו אינן ניתנות להחזר, ונקודות שלא נוצלו אינן פגות תוקף אלא אם צוין אחרת.",
    },
  },
  {
    title: {
      id: "4. Pembayaran", en: "4. Payments", zh: "4. 付款", ja: "4. 支払い", ko: "4. 결제",
      hi: "4. भुगतान", es: "4. Pagos", fr: "4. Paiements", de: "4. Zahlungen", th: "4. การชำระเงิน",
      vi: "4. Thanh toán", ar: "4. المدفوعات", tl: "4. Mga Bayad", it: "4. Pagamenti", he: "4. תשלומים",
    },
    body: {
      id: "Pembayaran dilakukan lewat QRIS dan dikonfirmasi manual setelah Anda mengunggah bukti pembayaran. Pastikan jumlah dan detailnya sesuai pesanan Anda — pembayaran yang salah atau tidak dapat diverifikasi bisa tertunda atau ditolak.",
      en: "Payments are made via QRIS and confirmed manually after you upload a payment receipt. Please make sure the amount and details match your order — incorrect or unverifiable payments may be delayed or rejected.",
      zh: "付款通过 QRIS 完成，并在您上传付款凭证后由人工确认。请确保金额和明细与您的订单相符——不正确或无法核实的付款可能会被延迟或拒绝。",
      ja: "お支払いは QRIS で行い、支払い領収書をアップロード後に手動で確認されます。金額と詳細がご注文内容と一致していることをご確認ください。誤った、または確認できない支払いは遅延または却下される場合があります。",
      ko: "결제는 QRIS로 이루어지며 결제 영수증을 업로드한 후 수동으로 확인됩니다. 금액과 세부 정보가 주문과 일치하는지 확인하세요 — 잘못되었거나 확인할 수 없는 결제는 지연되거나 거부될 수 있습니다.",
      hi: "भुगतान QRIS के माध्यम से किया जाता है और भुगतान रसीद अपलोड करने के बाद मैन्युअल रूप से पुष्टि की जाती है। कृपया सुनिश्चित करें कि राशि और विवरण आपके ऑर्डर से मेल खाते हों — गलत या असत्यापित भुगतान में देरी हो सकती है या उन्हें अस्वीकार किया जा सकता है।",
      es: "Los pagos se realizan mediante QRIS y se confirman manualmente después de que suba un comprobante de pago. Asegúrese de que el monto y los detalles coincidan con su pedido — los pagos incorrectos o no verificables pueden retrasarse o rechazarse.",
      fr: "Les paiements sont effectués via QRIS et confirmés manuellement après le téléchargement d'un reçu de paiement. Veuillez vous assurer que le montant et les détails correspondent à votre commande — les paiements incorrects ou non vérifiables peuvent être retardés ou refusés.",
      de: "Zahlungen erfolgen über QRIS und werden nach dem Hochladen eines Zahlungsbelegs manuell bestätigt. Bitte stellen Sie sicher, dass Betrag und Details mit Ihrer Bestellung übereinstimmen — falsche oder nicht verifizierbare Zahlungen können verzögert oder abgelehnt werden.",
      th: "การชำระเงินทำผ่าน QRIS และได้รับการยืนยันด้วยตนเองหลังจากที่คุณอัปโหลดหลักฐานการชำระเงิน โปรดตรวจสอบให้แน่ใจว่าจำนวนเงินและรายละเอียดตรงกับคำสั่งซื้อของคุณ — การชำระเงินที่ไม่ถูกต้องหรือไม่สามารถตรวจสอบได้อาจล่าช้าหรือถูกปฏิเสธ",
      vi: "Thanh toán được thực hiện qua QRIS và được xác nhận thủ công sau khi bạn tải lên biên lai thanh toán. Vui lòng đảm bảo số tiền và chi tiết khớp với đơn hàng của bạn — thanh toán sai hoặc không thể xác minh có thể bị trì hoãn hoặc từ chối.",
      ar: "تتم المدفوعات عبر QRIS ويتم تأكيدها يدويًا بعد رفع إيصال الدفع. يرجى التأكد من تطابق المبلغ والتفاصيل مع طلبك — قد تتأخر أو تُرفض المدفوعات غير الصحيحة أو التي يتعذر التحقق منها.",
      tl: "Ginagawa ang mga bayad sa pamamagitan ng QRIS at kinukumpirma nang manu-mano matapos mong i-upload ang resibo ng bayad. Tiyaking tumutugma ang halaga at detalye sa iyong order — maaaring maantala o matanggihan ang mga maling o hindi na-verify na bayad.",
      it: "I pagamenti vengono effettuati tramite QRIS e confermati manualmente dopo aver caricato una ricevuta di pagamento. Assicurati che l'importo e i dettagli corrispondano al tuo ordine — pagamenti errati o non verificabili potrebbero essere ritardati o rifiutati.",
      he: "התשלומים מתבצעים דרך QRIS ומאושרים ידנית לאחר שתעלה קבלת תשלום. ודא שהסכום והפרטים תואמים להזמנתך — תשלומים שגויים או שלא ניתן לאמת אותם עשויים להתעכב או להידחות.",
    },
  },
  {
    title: {
      id: "5. Penggunaan yang wajar", en: "5. Acceptable use", zh: "5. 可接受的使用方式", ja: "5. 適切な利用", ko: "5. 허용되는 사용",
      hi: "5. स्वीकार्य उपयोग", es: "5. Uso aceptable", fr: "5. Utilisation acceptable", de: "5. Zulässige Nutzung", th: "5. การใช้งานที่ยอมรับได้",
      vi: "5. Sử dụng hợp lệ", ar: "5. الاستخدام المقبول", tl: "5. Katanggap-tanggap na paggamit", it: "5. Uso accettabile", he: "5. שימוש מקובל",
    },
    body: {
      id: "Anda setuju untuk tidak menggunakan Magic Talk untuk tujuan yang melanggar hukum, kasar, atau merugikan, termasuk mengunggah konten yang melanggar hak orang lain atau melanggar hukum yang berlaku.",
      en: "You agree not to use Magic Talk for unlawful, abusive, or harmful purposes, including uploading content that infringes on others' rights or violates applicable law.",
      zh: "您同意不将 Magic Talk 用于非法、辱骂或有害目的，包括上传侵犯他人权利或违反适用法律的内容。",
      ja: "Magic Talk を、違法・虐待的・有害な目的（他者の権利を侵害する、または適用法に違反するコンテンツのアップロードを含む）に使用しないことに同意するものとします。",
      ko: "귀하는 Magic Talk를 불법적이거나 학대적이거나 유해한 목적으로 사용하지 않으며, 타인의 권리를 침해하거나 관련 법률을 위반하는 콘텐츠를 업로드하지 않는 데 동의합니다.",
      hi: "आप सहमत हैं कि आप Magic Talk का उपयोग गैरकानूनी, अपमानजनक या हानिकारक उद्देश्यों के लिए नहीं करेंगे, जिसमें ऐसी सामग्री अपलोड करना शामिल है जो दूसरों के अधिकारों का उल्लंघन करती हो या लागू कानून का उल्लंघन करती हो।",
      es: "Usted acepta no usar Magic Talk con fines ilegales, abusivos o dañinos, incluida la carga de contenido que infrinja los derechos de terceros o viole la ley aplicable.",
      fr: "Vous acceptez de ne pas utiliser Magic Talk à des fins illégales, abusives ou nuisibles, y compris le téléchargement de contenu qui enfreint les droits d'autrui ou viole la loi applicable.",
      de: "Sie stimmen zu, Magic Talk nicht für rechtswidrige, missbräuchliche oder schädliche Zwecke zu nutzen, einschließlich des Hochladens von Inhalten, die die Rechte anderer verletzen oder gegen geltendes Recht verstoßen.",
      th: "คุณตกลงที่จะไม่ใช้ Magic Talk เพื่อจุดประสงค์ที่ผิดกฎหมาย ล่วงละเมิด หรือเป็นอันตราย รวมถึงการอัปโหลดเนื้อหาที่ละเมิดสิทธิ์ของผู้อื่นหรือฝ่าฝืนกฎหมายที่บังคับใช้",
      vi: "Bạn đồng ý không sử dụng Magic Talk cho mục đích bất hợp pháp, lạm dụng hoặc gây hại, bao gồm việc tải lên nội dung xâm phạm quyền của người khác hoặc vi phạm luật hiện hành.",
      ar: "أنت توافق على عدم استخدام Magic Talk لأغراض غير قانونية أو مسيئة أو ضارة، بما في ذلك رفع محتوى ينتهك حقوق الآخرين أو يخالف القانون المعمول به.",
      tl: "Sumasang-ayon kang hindi gagamitin ang Magic Talk para sa labag sa batas, mapang-abuso, o nakakapinsalang layunin, kabilang ang pag-upload ng nilalaman na lumalabag sa karapatan ng iba o sa naaangkop na batas.",
      it: "Accetti di non utilizzare Magic Talk per scopi illegali, offensivi o dannosi, incluso il caricamento di contenuti che violano i diritti altrui o le leggi applicabili.",
      he: "אתה מסכים שלא להשתמש ב-Magic Talk למטרות בלתי חוקיות, פוגעניות או מזיקות, לרבות העלאת תוכן המפר את זכויות הזולת או מפר את החוק החל.",
    },
  },
  {
    title: {
      id: "6. Batasan tanggung jawab", en: "6. Limitation of liability", zh: "6. 责任限制", ja: "6. 責任の制限", ko: "6. 책임 제한",
      hi: "6. दायित्व की सीमा", es: "6. Limitación de responsabilidad", fr: "6. Limitation de responsabilité", de: "6. Haftungsbeschränkung", th: "6. ข้อจำกัดความรับผิด",
      vi: "6. Giới hạn trách nhiệm", ar: "6. حدود المسؤولية", tl: "6. Limitasyon ng pananagutan", it: "6. Limitazione di responsabilità", he: "6. הגבלת אחריות",
    },
    body: {
      id: "Magic Talk disediakan \"apa adanya\". Transkrip, terjemahan dan caption hasil AI bisa mengandung kesalahan — selalu periksa dulu sebelum mengirim. Kami tidak bertanggung jawab atas kerugian akibat mengandalkan konten hasil AI atau gangguan layanan.",
      en: "Magic Talk is provided \"as is\". AI-generated transcripts, translations and captions may contain errors — always review them before sending. We are not liable for losses arising from reliance on AI-generated content or from service interruptions.",
      zh: "Magic Talk 按「现状」提供。AI 生成的转录、翻译和配文可能包含错误——发送前请务必检查。对于因依赖 AI 生成内容或服务中断而造成的损失，我们概不负责。",
      ja: "Magic Talk は「現状のまま」提供されます。AI が生成した文字起こし、翻訳、キャプションには誤りが含まれる場合があります — 送信前に必ず確認してください。AI 生成コンテンツへの依存やサービス中断に起因する損失について、当方は責任を負いません。",
      ko: "Magic Talk는 \"있는 그대로\" 제공됩니다. AI가 생성한 받아쓰기, 번역, 캡션에는 오류가 있을 수 있습니다 — 전송 전에 항상 검토하세요. AI 생성 콘텐츠에 의존하거나 서비스 중단으로 인해 발생하는 손실에 대해 당사는 책임지지 않습니다.",
      hi: "Magic Talk \"जैसा है वैसा\" प्रदान किया जाता है। AI-जनित ट्रांसक्रिप्ट, अनुवाद और कैप्शन में त्रुटियां हो सकती हैं — भेजने से पहले हमेशा उनकी समीक्षा करें। AI-जनित सामग्री पर निर्भरता या सेवा में रुकावट से उत्पन्न नुकसान के लिए हम उत्तरदायी नहीं हैं।",
      es: "Magic Talk se proporciona \"tal cual\". Las transcripciones, traducciones y subtítulos generados por IA pueden contener errores — revíselos siempre antes de enviar. No somos responsables de las pérdidas derivadas de confiar en contenido generado por IA o de interrupciones del servicio.",
      fr: "Magic Talk est fourni \"tel quel\". Les transcriptions, traductions et légendes générées par l'IA peuvent contenir des erreurs — vérifiez-les toujours avant l'envoi. Nous ne sommes pas responsables des pertes résultant de la confiance accordée au contenu généré par l'IA ou des interruptions de service.",
      de: "Magic Talk wird „wie besehen“ bereitgestellt. KI-generierte Transkripte, Übersetzungen und Bildunterschriften können Fehler enthalten — prüfen Sie diese immer vor dem Versand. Wir haften nicht für Verluste, die durch das Vertrauen auf KI-generierte Inhalte oder Dienstunterbrechungen entstehen.",
      th: "Magic Talk ให้บริการ \"ตามสภาพ\" ข้อความถอดเสียง คำแปล และคำบรรยายที่สร้างโดย AI อาจมีข้อผิดพลาด — ควรตรวจสอบก่อนส่งเสมอ เราไม่รับผิดชอบต่อความสูญเสียที่เกิดจากการพึ่งพาเนื้อหาที่สร้างโดย AI หรือจากการหยุดชะงักของบริการ",
      vi: "Magic Talk được cung cấp \"nguyên trạng\". Bản ghi, bản dịch và chú thích do AI tạo ra có thể chứa lỗi — luôn kiểm tra lại trước khi gửi. Chúng tôi không chịu trách nhiệm cho tổn thất phát sinh từ việc dựa vào nội dung do AI tạo ra hoặc từ gián đoạn dịch vụ.",
      ar: "يُقدَّم Magic Talk \"كما هو\". قد تحتوي النصوص المُفرَّغة والترجمات والتعليقات المُولَّدة بالذكاء الاصطناعي على أخطاء — راجعها دائمًا قبل الإرسال. نحن غير مسؤولين عن أي خسائر ناتجة عن الاعتماد على محتوى مُولَّد بالذكاء الاصطناعي أو عن انقطاع الخدمة.",
      tl: "Ibinibigay ang Magic Talk \"nang walang garantiya\". Ang mga transcript, salin, at caption na ginawa ng AI ay maaaring magkaroon ng mali — laging suriin bago ipadala. Hindi kami mananagot sa mga pagkalugi mula sa pag-asa sa nilalaman na ginawa ng AI o sa mga pagkaantala ng serbisyo.",
      it: "Magic Talk viene fornito \"così com'è\". Trascrizioni, traduzioni e didascalie generate dall'IA possono contenere errori — controllale sempre prima di inviare. Non siamo responsabili per perdite derivanti dall'affidamento su contenuti generati dall'IA o da interruzioni del servizio.",
      he: "Magic Talk מסופק \"כפי שהוא\". תמלולים, תרגומים וכיתובים שנוצרו על ידי בינה מלאכותית עשויים להכיל שגיאות — תמיד בדוק אותם לפני השליחה. איננו אחראים להפסדים הנובעים מהסתמכות על תוכן שנוצר על ידי בינה מלאכותית או מהפרעות בשירות.",
    },
  },
  {
    title: {
      id: "7. Perubahan", en: "7. Changes", zh: "7. 变更", ja: "7. 変更", ko: "7. 변경 사항",
      hi: "7. परिवर्तन", es: "7. Cambios", fr: "7. Modifications", de: "7. Änderungen", th: "7. การเปลี่ยนแปลง",
      vi: "7. Thay đổi", ar: "7. التغييرات", tl: "7. Mga Pagbabago", it: "7. Modifiche", he: "7. שינויים",
    },
    body: {
      id: "Syarat ini bisa diperbarui dari waktu ke waktu. Penggunaan Magic Talk yang berkelanjutan setelah perubahan berlaku berarti Anda menyetujui syarat yang diperbarui.",
      en: "These terms may be updated from time to time. Continued use of Magic Talk after changes take effect means you accept the updated terms.",
      zh: "本条款可能会不时更新。变更生效后继续使用 Magic Talk 即表示您接受更新后的条款。",
      ja: "本規約は随時更新される場合があります。変更が発効した後も Magic Talk をご利用いただく場合、更新後の規約に同意したものとみなされます。",
      ko: "본 약관은 수시로 업데이트될 수 있습니다. 변경 사항이 적용된 후에도 Magic Talk를 계속 사용하시면 업데이트된 약관에 동의하는 것으로 간주됩니다.",
      hi: "ये शर्तें समय-समय पर अपडेट की जा सकती हैं। परिवर्तन लागू होने के बाद Magic Talk का निरंतर उपयोग करने का अर्थ है कि आप अपडेट की गई शर्तों को स्वीकार करते हैं।",
      es: "Estos términos pueden actualizarse de vez en cuando. El uso continuado de Magic Talk después de que los cambios entren en vigor significa que acepta los términos actualizados.",
      fr: "Ces conditions peuvent être mises à jour de temps à autre. L'utilisation continue de Magic Talk après l'entrée en vigueur des modifications signifie que vous acceptez les conditions mises à jour.",
      de: "Diese Bedingungen können von Zeit zu Zeit aktualisiert werden. Die fortgesetzte Nutzung von Magic Talk nach Inkrafttreten von Änderungen bedeutet, dass Sie die aktualisierten Bedingungen akzeptieren.",
      th: "ข้อกำหนดเหล่านี้อาจมีการปรับปรุงเป็นครั้งคราว การใช้งาน Magic Talk ต่อไปหลังจากการเปลี่ยนแปลงมีผลบังคับใช้ถือว่าคุณยอมรับข้อกำหนดที่ปรับปรุงแล้ว",
      vi: "Các điều khoản này có thể được cập nhật theo thời gian. Việc tiếp tục sử dụng Magic Talk sau khi thay đổi có hiệu lực đồng nghĩa với việc bạn chấp nhận các điều khoản đã cập nhật.",
      ar: "قد يتم تحديث هذه الشروط من وقت لآخر. استمرار استخدام Magic Talk بعد سريان التغييرات يعني أنك تقبل الشروط المحدثة.",
      tl: "Ang mga tuntuning ito ay maaaring i-update paminsan-minsan. Ang patuloy na paggamit ng Magic Talk pagkatapos magkabisa ang mga pagbabago ay nangangahulugang tinatanggap mo ang na-update na mga tuntunin.",
      it: "Questi termini possono essere aggiornati di tanto in tanto. L'uso continuato di Magic Talk dopo l'entrata in vigore delle modifiche significa che accetti i termini aggiornati.",
      he: "תנאים אלה עשויים להתעדכן מעת לעת. המשך השימוש ב-Magic Talk לאחר כניסת השינויים לתוקף משמעו שאתה מקבל את התנאים המעודכנים.",
    },
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="mt-1 space-y-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

function TermsPage() {
  const { lang } = useLang();
  const t = useT();

  return (
    <main className="min-h-screen bg-background pb-16">
      <header className="border-b border-border bg-card/70 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="size-4" /> {t("backToHome")}
          </Link>
          <LanguageSwitcher />
        </div>
        <h1 className="mt-2 text-3xl leading-none text-foreground">{pageTitle[lang]}</h1>
      </header>

      <div className="mx-auto max-w-2xl space-y-3 px-4 py-6">
        {sections.map((s) => (
          <Section key={s.title.en} title={s.title[lang]}>
            <p>{s.body[lang]}</p>
          </Section>
        ))}
      </div>
    </main>
  );
}
