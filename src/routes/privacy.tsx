import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useLang, useT, type Lang } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Magic Talk" },
      { name: "description", content: "How Magic Talk collects, uses and protects your data." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrivacyPage,
});

type LText = Record<Lang, string>;

const pageTitle: LText = {
  id: "Kebijakan Privasi",
  en: "Privacy Policy",
  zh: "隐私政策",
  ja: "プライバシーポリシー",
  ko: "개인정보 처리방침",
  hi: "गोपनीयता नीति",
  es: "Política de Privacidad",
  fr: "Politique de Confidentialité",
  de: "Datenschutzrichtlinie",
  th: "นโยบายความเป็นส่วนตัว",
  vi: "Chính sách Quyền riêng tư",
  ar: "سياسة الخصوصية",
  tl: "Patakaran sa Privacy",
  it: "Informativa sulla Privacy",
  he: "מדיניות פרטיות",
};

const sections: { title: LText; body: LText }[] = [
  {
    title: {
      id: "Apa yang kami kumpulkan", en: "What we collect", zh: "我们收集的信息", ja: "収集する情報", ko: "수집하는 정보",
      hi: "हम क्या एकत्र करते हैं", es: "Qué recopilamos", fr: "Ce que nous collectons", de: "Was wir erfassen", th: "สิ่งที่เราเก็บรวบรวม",
      vi: "Những gì chúng tôi thu thập", ar: "ما الذي نجمعه", tl: "Ano ang kinokolekta namin", it: "Cosa raccogliamo", he: "מה אנחנו אוספים",
    },
    body: {
      id: "Pengenal perangkat (disimpan lokal di ponsel Anda), serta nama, nomor WhatsApp dan alamat email yang Anda berikan saat memesan paket atau top-up kredit. Bukti pembayaran dan foto yang Anda unggah disimpan untuk memproses pesanan Anda dan menampilkan lampiran memo Anda.",
      en: "A device identifier (stored locally on your phone), and any name, WhatsApp number and email address you provide when ordering a plan or credit top-up. Payment receipts and photos you upload are stored to process your order and to display your memo attachments.",
      zh: "设备标识符（保存在您手机本地），以及您在订购套餐或充值额度时提供的姓名、WhatsApp 号码和电子邮件地址。您上传的付款凭证和照片会被存储，用于处理您的订单并显示备忘录附件。",
      ja: "端末識別子（お使いの携帯電話にローカル保存されます）、およびプラン注文やクレジットチャージ時にご提供いただいたお名前・WhatsApp 番号・メールアドレス。アップロードされた支払い領収書や写真は、注文処理およびメモの添付ファイル表示のために保存されます。",
      ko: "기기 식별자(휴대폰에 로컬로 저장됨)와 요금제 주문 또는 크레딧 충전 시 제공하신 이름, WhatsApp 번호, 이메일 주소. 업로드하신 결제 영수증과 사진은 주문 처리 및 메모 첨부 파일 표시를 위해 저장됩니다.",
      hi: "एक डिवाइस पहचानकर्ता (आपके फ़ोन पर स्थानीय रूप से संग्रहीत), और कोई भी नाम, WhatsApp नंबर और ईमेल पता जो आप प्लान या क्रेडिट टॉप-अप ऑर्डर करते समय प्रदान करते हैं। आपके द्वारा अपलोड की गई भुगतान रसीदें और फ़ोटो आपके ऑर्डर को प्रोसेस करने और आपके मेमो अटैचमेंट दिखाने के लिए संग्रहीत की जाती हैं।",
      es: "Un identificador de dispositivo (almacenado localmente en su teléfono), y cualquier nombre, número de WhatsApp y dirección de correo electrónico que proporcione al pedir un plan o recarga de créditos. Los comprobantes de pago y las fotos que suba se almacenan para procesar su pedido y mostrar los archivos adjuntos de su memo.",
      fr: "Un identifiant d'appareil (stocké localement sur votre téléphone), ainsi que tout nom, numéro WhatsApp et adresse e-mail que vous fournissez lors de la commande d'un forfait ou d'une recharge de crédits. Les reçus de paiement et les photos que vous téléchargez sont stockés pour traiter votre commande et afficher les pièces jointes de votre mémo.",
      de: "Eine Geräte-ID (lokal auf Ihrem Telefon gespeichert) sowie Name, WhatsApp-Nummer und E-Mail-Adresse, die Sie bei der Bestellung eines Plans oder einer Guthabenaufladung angeben. Hochgeladene Zahlungsbelege und Fotos werden gespeichert, um Ihre Bestellung zu bearbeiten und Ihre Memo-Anhänge anzuzeigen.",
      th: "ตัวระบุอุปกรณ์ (จัดเก็บในเครื่องของคุณ) และชื่อ หมายเลข WhatsApp และอีเมลที่คุณให้ไว้เมื่อสั่งซื้อแพ็กเกจหรือเติมเครดิต ใบเสร็จการชำระเงินและรูปภาพที่คุณอัปโหลดจะถูกจัดเก็บเพื่อดำเนินการตามคำสั่งซื้อของคุณและแสดงไฟล์แนบในบันทึกของคุณ",
      vi: "Mã định danh thiết bị (lưu cục bộ trên điện thoại của bạn), cùng với tên, số WhatsApp và địa chỉ email bạn cung cấp khi đặt gói hoặc nạp tín dụng. Biên lai thanh toán và ảnh bạn tải lên được lưu trữ để xử lý đơn hàng và hiển thị tệp đính kèm ghi chú của bạn.",
      ar: "معرّف الجهاز (مخزَّن محليًا على هاتفك)، وأي اسم ورقم واتساب وعنوان بريد إلكتروني تقدّمه عند طلب باقة أو شحن رصيد. يتم تخزين إيصالات الدفع والصور التي ترفعها لمعالجة طلبك وعرض مرفقات مذكرتك.",
      tl: "Isang device identifier (naka-imbak nang lokal sa iyong telepono), at anumang pangalan, numero ng WhatsApp, at email address na ibinibigay mo kapag nag-order ng plan o credit top-up. Ang mga resibo ng bayad at larawang ina-upload mo ay naka-imbak para iproseso ang iyong order at ipakita ang mga attachment ng iyong memo.",
      it: "Un identificatore del dispositivo (memorizzato localmente sul tuo telefono), e qualsiasi nome, numero WhatsApp e indirizzo email che fornisci quando ordini un piano o una ricarica di crediti. Le ricevute di pagamento e le foto che carichi vengono memorizzate per elaborare il tuo ordine e mostrare gli allegati del tuo memo.",
      he: "מזהה מכשיר (מאוחסן מקומית בטלפון שלך), וכל שם, מספר וואטסאפ וכתובת דוא\"ל שאתה מספק בעת הזמנת תוכנית או טעינת נקודות. קבלות תשלום ותמונות שאתה מעלה מאוחסנות כדי לעבד את הזמנתך ולהציג את קבצי התזכיר המצורפים שלך.",
    },
  },
  {
    title: {
      id: "Suara, foto dan teks yang Anda kirim", en: "Voice, photos and text you submit", zh: "您提交的语音、照片和文字", ja: "送信する音声・写真・テキスト", ko: "제출하는 음성, 사진, 텍스트",
      hi: "आपके द्वारा सबमिट की गई आवाज़, फ़ोटो और टेक्स्ट", es: "Voz, fotos y texto que envía", fr: "Voix, photos et texte que vous soumettez", de: "Stimme, Fotos und Text, die Sie übermitteln", th: "เสียง รูปภาพ และข้อความที่คุณส่ง",
      vi: "Giọng nói, ảnh và văn bản bạn gửi", ar: "الصوت والصور والنص الذي ترسله", tl: "Boses, larawan, at tekstong ipinapasa mo", it: "Voce, foto e testo che invii", he: "קול, תמונות וטקסט שאתה שולח",
    },
    body: {
      id: "Audio yang Anda rekam, teks yang Anda masukkan, dan foto yang Anda pilih untuk di-caption otomatis dikirim ke penyedia AI kami semata-mata untuk menghasilkan transkrip, terjemahan atau caption yang Anda minta. Kami tidak menggunakan konten ini untuk melatih model AI.",
      en: "Audio you record, text you enter, and photos you choose to auto-caption are sent to our AI provider solely to produce the transcript, translation or caption you requested. We don't use this content to train AI models.",
      zh: "您录制的音频、输入的文字，以及您选择自动配文的照片，将仅为生成您所请求的转录、翻译或配文而发送给我们的 AI 提供商。我们不会使用这些内容来训练 AI 模型。",
      ja: "録音した音声、入力したテキスト、自動キャプションを選択した写真は、ご依頼いただいた文字起こし・翻訳・キャプションを作成する目的でのみ AI プロバイダーに送信されます。これらのコンテンツを AI モデルの学習に使用することはありません。",
      ko: "녹음한 오디오, 입력한 텍스트, 자동 캡션을 선택한 사진은 요청하신 받아쓰기, 번역 또는 캡션을 생성하기 위한 목적으로만 AI 제공업체에 전송됩니다. 이 콘텐츠를 AI 모델 학습에 사용하지 않습니다.",
      hi: "आपके द्वारा रिकॉर्ड किया गया ऑडियो, आपके द्वारा दर्ज किया गया टेक्स्ट, और आपके द्वारा ऑटो-कैप्शन के लिए चुनी गई फ़ोटो केवल आपके अनुरोधित ट्रांसक्रिप्ट, अनुवाद या कैप्शन बनाने के लिए हमारे AI प्रदाता को भेजी जाती हैं। हम इस सामग्री का उपयोग AI मॉडल को प्रशिक्षित करने के लिए नहीं करते हैं।",
      es: "El audio que graba, el texto que ingresa y las fotos que elige para subtitular automáticamente se envían a nuestro proveedor de IA únicamente para producir la transcripción, traducción o subtítulo que solicitó. No usamos este contenido para entrenar modelos de IA.",
      fr: "L'audio que vous enregistrez, le texte que vous saisissez et les photos que vous choisissez de sous-titrer automatiquement sont envoyés à notre fournisseur d'IA uniquement pour produire la transcription, la traduction ou la légende demandée. Nous n'utilisons pas ce contenu pour entraîner des modèles d'IA.",
      de: "Von Ihnen aufgenommenes Audio, eingegebener Text und Fotos, die Sie für die automatische Bildunterschrift auswählen, werden ausschließlich zur Erstellung des von Ihnen angeforderten Transkripts, der Übersetzung oder Bildunterschrift an unseren KI-Anbieter gesendet. Wir verwenden diese Inhalte nicht zum Trainieren von KI-Modellen.",
      th: "เสียงที่คุณบันทึก ข้อความที่คุณป้อน และรูปภาพที่คุณเลือกให้ใส่คำบรรยายอัตโนมัติ จะถูกส่งไปยังผู้ให้บริการ AI ของเราเพื่อสร้างข้อความถอดเสียง คำแปล หรือคำบรรยายที่คุณร้องขอเท่านั้น เราไม่ใช้เนื้อหานี้ในการฝึกโมเดล AI",
      vi: "Âm thanh bạn ghi âm, văn bản bạn nhập, và ảnh bạn chọn để chú thích tự động được gửi đến nhà cung cấp AI của chúng tôi chỉ nhằm mục đích tạo bản ghi, bản dịch hoặc chú thích mà bạn yêu cầu. Chúng tôi không dùng nội dung này để huấn luyện mô hình AI.",
      ar: "يتم إرسال الصوت الذي تسجله، والنص الذي تدخله، والصور التي تختارها للتعليق التلقائي إلى مزوّد الذكاء الاصطناعي لدينا فقط لإنتاج النص المُفرَّغ أو الترجمة أو التعليق الذي طلبته. نحن لا نستخدم هذا المحتوى لتدريب نماذج الذكاء الاصطناعي.",
      tl: "Ang audio na iyong ni-record, tekstong ipinasok mo, at mga larawang pinili mong i-auto-caption ay ipinapadala sa aming AI provider para lamang gawin ang transcript, salin, o caption na hiniling mo. Hindi namin ginagamit ang nilalamang ito para sanayin ang mga modelo ng AI.",
      it: "L'audio che registri, il testo che inserisci e le foto che scegli di didascalizzare automaticamente vengono inviati al nostro fornitore di IA esclusivamente per produrre la trascrizione, la traduzione o la didascalia richiesta. Non utilizziamo questo contenuto per addestrare modelli di IA.",
      he: "אודיו שאתה מקליט, טקסט שאתה מזין, ותמונות שאתה בוחר לכתב אוטומטית נשלחים לספק הבינה המלאכותית שלנו אך ורק כדי להפיק את התמלול, התרגום או הכיתוב שביקשת. איננו משתמשים בתוכן זה כדי לאמן מודלים של בינה מלאכותית.",
    },
  },
  {
    title: {
      id: "Bagaimana kami menggunakan data Anda", en: "How we use your data", zh: "我们如何使用您的数据", ja: "データの利用方法", ko: "데이터 사용 방법",
      hi: "हम आपके डेटा का उपयोग कैसे करते हैं", es: "Cómo usamos sus datos", fr: "Comment nous utilisons vos données", de: "Wie wir Ihre Daten verwenden", th: "เราใช้ข้อมูลของคุณอย่างไร",
      vi: "Cách chúng tôi sử dụng dữ liệu của bạn", ar: "كيف نستخدم بياناتك", tl: "Paano namin ginagamit ang iyong data", it: "Come utilizziamo i tuoi dati", he: "כיצד אנו משתמשים בנתונים שלך",
    },
    body: {
      id: "Untuk menjalankan langganan dan saldo kredit Anda, mengirim kode voucher, memverifikasi pembayaran, dan meningkatkan layanan. Kami tidak menjual data pribadi Anda.",
      en: "To run your subscription and credit balance, deliver voucher codes, verify payments, and improve the service. We don't sell your personal data.",
      zh: "用于管理您的订阅和额度余额、发送兑换码、核实付款以及改进服务。我们不会出售您的个人数据。",
      ja: "サブスクリプションとクレジット残高の運用、バウチャーコードの提供、支払いの確認、サービスの改善のために使用します。お客様の個人データを販売することはありません。",
      ko: "구독 및 크레딧 잔액 운영, 바우처 코드 전달, 결제 확인, 서비스 개선을 위해 사용합니다. 귀하의 개인 데이터를 판매하지 않습니다.",
      hi: "आपकी सब्सक्रिप्शन और क्रेडिट बैलेंस चलाने, वाउचर कोड देने, भुगतान सत्यापित करने और सेवा में सुधार के लिए। हम आपका व्यक्तिगत डेटा नहीं बेचते हैं।",
      es: "Para gestionar su suscripción y saldo de créditos, entregar códigos de vales, verificar pagos y mejorar el servicio. No vendemos sus datos personales.",
      fr: "Pour gérer votre abonnement et votre solde de crédits, livrer les codes de bons, vérifier les paiements et améliorer le service. Nous ne vendons pas vos données personnelles.",
      de: "Um Ihr Abonnement und Guthaben zu verwalten, Gutscheincodes bereitzustellen, Zahlungen zu überprüfen und den Dienst zu verbessern. Wir verkaufen Ihre persönlichen Daten nicht.",
      th: "เพื่อดำเนินการสมัครสมาชิกและยอดเครดิตของคุณ ส่งรหัสวอเชอร์ ยืนยันการชำระเงิน และปรับปรุงบริการ เราไม่ขายข้อมูลส่วนบุคคลของคุณ",
      vi: "Để vận hành gói đăng ký và số dư tín dụng của bạn, gửi mã voucher, xác minh thanh toán và cải thiện dịch vụ. Chúng tôi không bán dữ liệu cá nhân của bạn.",
      ar: "لإدارة اشتراكك ورصيدك، وتسليم رموز القسائم، والتحقق من المدفوعات، وتحسين الخدمة. نحن لا نبيع بياناتك الشخصية.",
      tl: "Para patakbuhin ang iyong subscription at balanse ng credit, maghatid ng mga voucher code, i-verify ang mga bayad, at pagbutihin ang serbisyo. Hindi namin ibinebenta ang iyong personal na data.",
      it: "Per gestire il tuo abbonamento e saldo crediti, consegnare codici buono, verificare i pagamenti e migliorare il servizio. Non vendiamo i tuoi dati personali.",
      he: "כדי להפעיל את המנוי ויתרת הנקודות שלך, למסור קודי שוברים, לאמת תשלומים, ולשפר את השירות. איננו מוכרים את הנתונים האישיים שלך.",
    },
  },
  {
    title: {
      id: "Penyimpanan dan retensi", en: "Storage and retention", zh: "存储与保留", ja: "保存と保持", ko: "저장 및 보관",
      hi: "भंडारण और प्रतिधारण", es: "Almacenamiento y retención", fr: "Stockage et conservation", de: "Speicherung und Aufbewahrung", th: "การจัดเก็บและการเก็บรักษา",
      vi: "Lưu trữ và bảo lưu", ar: "التخزين والاحتفاظ", tl: "Pag-iimbak at pagpapanatili", it: "Archiviazione e conservazione", he: "אחסון ושמירה",
    },
    body: {
      id: "Data disimpan di database dan penyimpanan file kami selama akun Anda aktif, atau selama diperlukan untuk keperluan hukum, akuntansi atau dukungan.",
      en: "Data is stored in our database and file storage for as long as your account is active, or as needed for legal, accounting or support purposes.",
      zh: "只要您的账户处于活跃状态，或出于法律、会计或支持目的所需，数据就会存储在我们的数据库和文件存储中。",
      ja: "データは、お客様のアカウントが有効である限り、または法務・会計・サポート目的で必要な限り、当社のデータベースおよびファイルストレージに保存されます。",
      ko: "데이터는 귀하의 계정이 활성 상태인 동안, 또는 법적, 회계적, 지원 목적으로 필요한 기간 동안 당사 데이터베이스 및 파일 저장소에 저장됩니다.",
      hi: "जब तक आपका खाता सक्रिय है, या कानूनी, लेखांकन या सहायता उद्देश्यों के लिए आवश्यक हो, तब तक डेटा हमारे डेटाबेस और फ़ाइल स्टोरेज में संग्रहीत रहता है।",
      es: "Los datos se almacenan en nuestra base de datos y almacenamiento de archivos mientras su cuenta esté activa, o según sea necesario para fines legales, contables o de soporte.",
      fr: "Les données sont stockées dans notre base de données et notre stockage de fichiers tant que votre compte est actif, ou selon les besoins à des fins juridiques, comptables ou de support.",
      de: "Daten werden in unserer Datenbank und unserem Dateispeicher gespeichert, solange Ihr Konto aktiv ist oder soweit dies für rechtliche, buchhalterische oder Support-Zwecke erforderlich ist.",
      th: "ข้อมูลจะถูกจัดเก็บในฐานข้อมูลและที่จัดเก็บไฟล์ของเราตราบเท่าที่บัญชีของคุณยังใช้งานอยู่ หรือเท่าที่จำเป็นสำหรับวัตถุประสงค์ทางกฎหมาย บัญชี หรือการสนับสนุน",
      vi: "Dữ liệu được lưu trữ trong cơ sở dữ liệu và bộ lưu trữ tệp của chúng tôi trong thời gian tài khoản của bạn còn hoạt động, hoặc khi cần thiết cho mục đích pháp lý, kế toán hoặc hỗ trợ.",
      ar: "يتم تخزين البيانات في قاعدة بياناتنا وتخزين الملفات طالما حسابك نشط، أو حسب الحاجة لأغراض قانونية أو محاسبية أو للدعم.",
      tl: "Ang data ay naka-imbak sa aming database at file storage habang aktibo ang iyong account, o kung kinakailangan para sa legal, accounting, o suporta na layunin.",
      it: "I dati vengono memorizzati nel nostro database e nell'archiviazione file finché il tuo account è attivo, o secondo necessità per scopi legali, contabili o di supporto.",
      he: "הנתונים מאוחסנים במסד הנתונים ובאחסון הקבצים שלנו כל עוד חשבונך פעיל, או כנדרש לצרכים משפטיים, חשבונאיים או תמיכה.",
    },
  },
  {
    title: {
      id: "Pilihan Anda", en: "Your choices", zh: "您的选择", ja: "お客様の選択肢", ko: "귀하의 선택",
      hi: "आपके विकल्प", es: "Sus opciones", fr: "Vos choix", de: "Ihre Wahlmöglichkeiten", th: "ตัวเลือกของคุณ",
      vi: "Lựa chọn của bạn", ar: "خياراتك", tl: "Ang iyong mga pagpipilian", it: "Le tue scelte", he: "הבחירות שלך",
    },
    body: {
      id: "Anda bisa menggunakan transkripsi/terjemahan/caption manual alih-alih AI kapan saja. Hubungi admin (email recovery yang tertera di aplikasi) untuk meminta akses, koreksi atau penghapusan data Anda.",
      en: "You can use manual transcription/translation/captioning instead of AI at any time. Contact the admin (recovery email shown in the app) to request access, correction or deletion of your data.",
      zh: "您可以随时使用手动转录/翻译/配文而非 AI。请联系管理员（应用中显示的恢复邮箱）以请求访问、更正或删除您的数据。",
      ja: "いつでも AI の代わりに手動での文字起こし・翻訳・キャプション作成をご利用いただけます。データへのアクセス、修正、削除をご希望の場合は、管理者（アプリ内に表示される復旧用メール）までご連絡ください。",
      ko: "언제든지 AI 대신 수동 받아쓰기/번역/캡션을 사용할 수 있습니다. 데이터에 대한 접근, 수정 또는 삭제를 요청하려면 관리자(앱에 표시된 복구 이메일)에게 문의하세요.",
      hi: "आप किसी भी समय AI के बजाय मैन्युअल ट्रांसक्रिप्शन/अनुवाद/कैप्शनिंग का उपयोग कर सकते हैं। अपने डेटा तक पहुंच, सुधार या हटाने का अनुरोध करने के लिए एडमिन (ऐप में दिखाया गया रिकवरी ईमेल) से संपर्क करें।",
      es: "Puede usar transcripción/traducción/subtitulado manual en lugar de IA en cualquier momento. Contacte al administrador (correo de recuperación mostrado en la app) para solicitar acceso, corrección o eliminación de sus datos.",
      fr: "Vous pouvez utiliser la transcription/traduction/légende manuelle au lieu de l'IA à tout moment. Contactez l'administrateur (e-mail de récupération affiché dans l'application) pour demander l'accès, la correction ou la suppression de vos données.",
      de: "Sie können jederzeit anstelle von KI manuelle Transkription/Übersetzung/Bildunterschriften verwenden. Kontaktieren Sie den Administrator (in der App angezeigte Wiederherstellungs-E-Mail), um Zugriff, Korrektur oder Löschung Ihrer Daten zu beantragen.",
      th: "คุณสามารถใช้การถอดเสียง/แปล/คำบรรยายด้วยตนเองแทน AI ได้ตลอดเวลา ติดต่อผู้ดูแลระบบ (อีเมลกู้คืนที่แสดงในแอป) เพื่อขอเข้าถึง แก้ไข หรือลบข้อมูลของคุณ",
      vi: "Bạn có thể sử dụng phiên âm/dịch/chú thích thủ công thay vì AI bất cứ lúc nào. Liên hệ quản trị viên (email khôi phục hiển thị trong ứng dụng) để yêu cầu truy cập, sửa hoặc xóa dữ liệu của bạn.",
      ar: "يمكنك استخدام التفريغ/الترجمة/التعليق اليدوي بدلاً من الذكاء الاصطناعي في أي وقت. تواصل مع المسؤول (بريد الاسترداد الموضح في التطبيق) لطلب الوصول إلى بياناتك أو تصحيحها أو حذفها.",
      tl: "Maaari kang gumamit ng manu-manong transcription/pagsasalin/caption sa halip na AI anumang oras. Makipag-ugnayan sa admin (recovery email na ipinapakita sa app) para humiling ng access, pagwawasto, o pagtanggal ng iyong data.",
      it: "Puoi usare trascrizione/traduzione/didascalia manuale invece dell'IA in qualsiasi momento. Contatta l'amministratore (email di recupero mostrata nell'app) per richiedere accesso, correzione o cancellazione dei tuoi dati.",
      he: "תוכל להשתמש בתמלול/תרגום/כיתוב ידני במקום בינה מלאכותית בכל עת. פנה למנהל (דוא\"ל השחזור המוצג באפליקציה) כדי לבקש גישה, תיקון או מחיקה של הנתונים שלך.",
    },
  },
  {
    title: {
      id: "Perubahan", en: "Changes", zh: "变更", ja: "変更", ko: "변경 사항",
      hi: "परिवर्तन", es: "Cambios", fr: "Modifications", de: "Änderungen", th: "การเปลี่ยนแปลง",
      vi: "Thay đổi", ar: "التغييرات", tl: "Mga Pagbabago", it: "Modifiche", he: "שינויים",
    },
    body: {
      id: "Kebijakan ini bisa diperbarui dari waktu ke waktu; versi terbaru selalu berlaku.",
      en: "This policy may be updated from time to time; the latest version always applies.",
      zh: "本政策可能会不时更新；始终以最新版本为准。",
      ja: "本ポリシーは随時更新される場合があります。常に最新版が適用されます。",
      ko: "본 정책은 수시로 업데이트될 수 있으며, 항상 최신 버전이 적용됩니다.",
      hi: "यह नीति समय-समय पर अपडेट की जा सकती है; हमेशा नवीनतम संस्करण लागू होता है।",
      es: "Esta política puede actualizarse de vez en cuando; siempre se aplica la versión más reciente.",
      fr: "Cette politique peut être mise à jour de temps à autre ; la dernière version s'applique toujours.",
      de: "Diese Richtlinie kann von Zeit zu Zeit aktualisiert werden; es gilt stets die neueste Version.",
      th: "นโยบายนี้อาจมีการปรับปรุงเป็นครั้งคราว โดยเวอร์ชันล่าสุดจะมีผลบังคับใช้เสมอ",
      vi: "Chính sách này có thể được cập nhật theo thời gian; phiên bản mới nhất luôn được áp dụng.",
      ar: "قد يتم تحديث هذه السياسة من وقت لآخر؛ ويُطبَّق دائمًا أحدث إصدار منها.",
      tl: "Ang patakarang ito ay maaaring i-update paminsan-minsan; laging ipinapatupad ang pinakabagong bersyon.",
      it: "Questa informativa può essere aggiornata di tanto in tanto; si applica sempre la versione più recente.",
      he: "מדיניות זו עשויה להתעדכן מעת לעת; הגרסה העדכנית ביותר תמיד חלה.",
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

function PrivacyPage() {
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
