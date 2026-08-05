import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useLang, useT, type Lang } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export const Route = createFileRoute("/how-to-use")({
  head: () => ({
    meta: [
      { title: "How to Use — Magic Talk" },
      { name: "description", content: "A quick guide to recording, transcribing, translating and sending memos with Magic Talk." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HowToUsePage,
});

type LText = Record<Lang, string>;

const pageTitle: LText = {
  id: "Cara Pakai",
  en: "How to Use",
  zh: "使用说明",
  ja: "使い方",
  ko: "사용 방법",
  hi: "उपयोग कैसे करें",
  es: "Cómo usar",
  fr: "Mode d'emploi",
  de: "Anleitung",
  th: "วิธีใช้",
  vi: "Cách sử dụng",
  ar: "طريقة الاستخدام",
  tl: "Paano Gamitin",
  it: "Come si usa",
  he: "איך משתמשים",
};

const steps: { title: LText; body: LText }[] = [
  {
    title: {
      id: "1. Isi detail memo (opsional)",
      en: "1. Fill in the memo details (optional)",
      zh: "1. 填写备忘录详情（可选）",
      ja: "1. メモの詳細を入力（任意）",
      ko: "1. 메모 세부정보 입력(선택 사항)",
      hi: "1. मेमो विवरण भरें (वैकल्पिक)",
      es: "1. Complete los detalles del memo (opcional)",
      fr: "1. Renseignez les détails du mémo (facultatif)",
      de: "1. Memo-Details ausfüllen (optional)",
      th: "1. กรอกรายละเอียดบันทึก (ไม่บังคับ)",
      vi: "1. Điền chi tiết ghi chú (không bắt buộc)",
      ar: "1. املأ تفاصيل المذكرة (اختياري)",
      tl: "1. Punan ang detalye ng memo (opsyonal)",
      it: "1. Compila i dettagli del memo (facoltativo)",
      he: "1. מלא את פרטי התזכיר (אופציונלי)",
    },
    body: {
      id: "Tambahkan Tanggal, No. Dok., Kepada, Dari dan Subjek kalau Anda mengirim memo resmi. Aktifkan No Header kalau hanya ingin mengirim pesan biasa — ini menyembunyikan kolom-kolom itu dan tidak menyertakannya di pesan yang dikirim.",
      en: "Add Date, Doc. No., ATTN To, From and Subject if you're sending a formal memo. Turn on No Header if you only want to send a plain message — it hides those fields and leaves them out of what you send.",
      zh: "如果要发送正式备忘录，请填写日期、文档编号、收件人、发件人和主题。如果只想发送简单信息，打开「无标题」即可隐藏这些字段，发送内容也不会包含它们。",
      ja: "正式なメモを送る場合は、日付・文書番号・宛先・差出人・件名を入力してください。シンプルなメッセージだけを送りたい場合は「ヘッダーなし」をオンにすると、これらの項目が非表示になり送信内容にも含まれません。",
      ko: "공식 메모를 보낼 경우 날짜, 문서 번호, 수신인, 발신인, 제목을 입력하세요. 단순한 메시지만 보내고 싶다면 '헤더 없음'을 켜면 해당 항목이 숨겨지고 전송 내용에도 포함되지 않습니다.",
      hi: "यदि आप औपचारिक मेमो भेज रहे हैं तो दिनांक, दस्तावेज़ संख्या, प्रति, प्रेषक और विषय जोड़ें। यदि आप केवल एक सादा संदेश भेजना चाहते हैं तो No Header चालू करें — इससे ये फ़ील्ड छिप जाएंगे और भेजे गए संदेश में शामिल नहीं होंगे।",
      es: "Agregue Fecha, N.º de documento, Para, De y Asunto si va a enviar un memo formal. Active Sin encabezado si solo desea enviar un mensaje simple: esto oculta esos campos y los excluye de lo que envía.",
      fr: "Ajoutez la date, le n° de document, le destinataire, l'expéditeur et l'objet si vous envoyez un mémo formel. Activez Sans en-tête si vous voulez seulement envoyer un message simple — ces champs seront masqués et exclus de l'envoi.",
      de: "Fügen Sie Datum, Dok.-Nr., Empfänger, Absender und Betreff hinzu, wenn Sie ein formelles Memo senden. Aktivieren Sie „Ohne Kopfzeile“, wenn Sie nur eine einfache Nachricht senden möchten — diese Felder werden dann ausgeblendet und nicht mitgesendet.",
      th: "เพิ่มวันที่ เลขที่เอกสาร เรียน จาก และหัวข้อ หากคุณกำลังส่งบันทึกที่เป็นทางการ เปิดใช้งาน No Header หากต้องการส่งข้อความธรรมดาเท่านั้น — จะซ่อนช่องเหล่านี้และไม่รวมอยู่ในสิ่งที่คุณส่ง",
      vi: "Thêm Ngày, Số văn bản, Kính gửi, Từ và Chủ đề nếu bạn gửi ghi chú trang trọng. Bật No Header nếu chỉ muốn gửi tin nhắn đơn giản — các trường này sẽ bị ẩn và không được đưa vào nội dung gửi đi.",
      ar: "أضف التاريخ ورقم المستند والمرسل إليه والمرسل والموضوع إذا كنت ترسل مذكرة رسمية. فعّل خيار بدون ترويسة إذا كنت تريد إرسال رسالة بسيطة فقط — سيؤدي ذلك إلى إخفاء هذه الحقول واستبعادها مما ترسله.",
      tl: "Idagdag ang Petsa, Blg. ng Dokumento, Kanino, Mula kay at Paksa kung nagpapadala ka ng pormal na memo. I-on ang No Header kung gusto mo lang magpadala ng simpleng mensahe — itatago nito ang mga field na iyon at hindi isasama sa ipapadala mo.",
      it: "Aggiungi Data, N. documento, Destinatario, Mittente e Oggetto se stai inviando un memo formale. Attiva Senza intestazione se vuoi inviare solo un messaggio semplice — questo nasconde quei campi e li esclude da ciò che invii.",
      he: "הוסף תאריך, מספר מסמך, אל, מאת ונושא אם אתה שולח תזכיר רשמי. הפעל ללא כותרת אם אתה רוצה לשלוח הודעה פשוטה בלבד — זה מסתיר את השדות הללו ולא כולל אותם במה שאתה שולח.",
    },
  },
  {
    title: {
      id: "2. Rekam suara Anda",
      en: "2. Record your voice",
      zh: "2. 录制语音",
      ja: "2. 音声を録音",
      ko: "2. 음성 녹음",
      hi: "2. अपनी आवाज़ रिकॉर्ड करें",
      es: "2. Grabe su voz",
      fr: "2. Enregistrez votre voix",
      de: "2. Nehmen Sie Ihre Stimme auf",
      th: "2. อัดเสียงของคุณ",
      vi: "2. Ghi âm giọng nói của bạn",
      ar: "2. سجّل صوتك",
      tl: "2. I-record ang iyong boses",
      it: "2. Registra la tua voce",
      he: "2. הקלט את קולך",
    },
    body: {
      id: "Ketuk ikon mikrofon untuk mulai merekam, lalu ketuk lagi untuk berhenti. Rekaman Anda otomatis ditranskrip jadi teks — Anda bisa mengedit transkripnya setelahnya.",
      en: "Tap the microphone to start recording, then tap again to stop. Your recording is transcribed into text automatically — you can edit the transcript afterwards.",
      zh: "点击麦克风图标开始录音，再次点击即可停止。录音会自动转录成文字，之后您可以编辑转录内容。",
      ja: "マイクをタップして録音を開始し、もう一度タップすると停止します。録音は自動的にテキストへ文字起こしされ、後で編集できます。",
      ko: "마이크를 탭하여 녹음을 시작하고 다시 탭하면 중지됩니다. 녹음은 자동으로 텍스트로 변환되며, 이후 받아쓰기 내용을 편집할 수 있습니다.",
      hi: "रिकॉर्डिंग शुरू करने के लिए माइक्रोफ़ोन पर टैप करें, फिर रोकने के लिए फिर से टैप करें। आपकी रिकॉर्डिंग स्वतः टेक्स्ट में बदल जाती है — आप बाद में ट्रांसक्रिप्ट संपादित कर सकते हैं।",
      es: "Toque el micrófono para empezar a grabar y vuelva a tocarlo para detener. Su grabación se transcribe automáticamente en texto — puede editar la transcripción después.",
      fr: "Appuyez sur le microphone pour démarrer l'enregistrement, puis appuyez à nouveau pour l'arrêter. Votre enregistrement est automatiquement transcrit en texte — vous pouvez modifier la transcription ensuite.",
      de: "Tippen Sie auf das Mikrofon, um die Aufnahme zu starten, und erneut, um sie zu stoppen. Ihre Aufnahme wird automatisch in Text umgewandelt — Sie können das Transkript danach bearbeiten.",
      th: "แตะไมโครโฟนเพื่อเริ่มอัดเสียง แล้วแตะอีกครั้งเพื่อหยุด การบันทึกของคุณจะถูกถอดเป็นข้อความโดยอัตโนมัติ — คุณสามารถแก้ไขข้อความถอดเสียงได้ภายหลัง",
      vi: "Nhấn vào micro để bắt đầu ghi âm, sau đó nhấn lại để dừng. Bản ghi âm của bạn sẽ tự động được chuyển thành văn bản — bạn có thể chỉnh sửa bản ghi sau đó.",
      ar: "اضغط على الميكروفون لبدء التسجيل، ثم اضغط مرة أخرى للتوقف. يتم تفريغ تسجيلك إلى نص تلقائيًا — يمكنك تعديل النص لاحقًا.",
      tl: "I-tap ang mikropono para magsimulang mag-record, pagkatapos ay i-tap muli para itigil. Awtomatikong nagiging teksto ang iyong recording — maaari mong i-edit ang transcript pagkatapos.",
      it: "Tocca il microfono per iniziare a registrare, poi tocca di nuovo per fermarti. La tua registrazione viene trascritta automaticamente in testo — puoi modificare la trascrizione in seguito.",
      he: "הקש על המיקרופון כדי להתחיל להקליט, ולחץ שוב כדי לעצור. ההקלטה שלך מתומללת אוטומטית לטקסט — תוכל לערוך את התמלול לאחר מכן.",
    },
  },
  {
    title: {
      id: "3. Terjemahkan (opsional)",
      en: "3. Translate (optional)",
      zh: "3. 翻译（可选）",
      ja: "3. 翻訳（任意）",
      ko: "3. 번역(선택 사항)",
      hi: "3. अनुवाद करें (वैकल्पिक)",
      es: "3. Traducir (opcional)",
      fr: "3. Traduire (facultatif)",
      de: "3. Übersetzen (optional)",
      th: "3. แปลภาษา (ไม่บังคับ)",
      vi: "3. Dịch (không bắt buộc)",
      ar: "3. ترجمة (اختياري)",
      tl: "3. Isalin (opsyonal)",
      it: "3. Traduci (facoltativo)",
      he: "3. תרגם (אופציונלי)",
    },
    body: {
      id: "Pilih bahasa tujuan lalu ketuk Translate. Transkripnya diterjemahkan langsung di tempat, jadi Anda tetap bisa mengedit hasilnya.",
      en: "Pick a target language and tap Translate. The transcript is translated in place, so you can still edit the result.",
      zh: "选择目标语言并点击「翻译」。转录内容会原地翻译，您仍可编辑翻译结果。",
      ja: "翻訳先の言語を選んで「翻訳」をタップします。文字起こしはその場で翻訳され、結果も編集できます。",
      ko: "번역할 언어를 선택하고 번역을 탭하세요. 받아쓰기 내용이 그 자리에서 번역되며, 결과도 편집할 수 있습니다.",
      hi: "लक्ष्य भाषा चुनें और Translate पर टैप करें। ट्रांसक्रिप्ट उसी जगह अनुवादित हो जाती है, ताकि आप परिणाम को संपादित कर सकें।",
      es: "Elija un idioma de destino y toque Traducir. La transcripción se traduce en el mismo lugar, así que aún puede editar el resultado.",
      fr: "Choisissez une langue cible et appuyez sur Traduire. La transcription est traduite sur place, vous pouvez donc toujours modifier le résultat.",
      de: "Wählen Sie eine Zielsprache und tippen Sie auf Übersetzen. Das Transkript wird direkt übersetzt, sodass Sie das Ergebnis weiterhin bearbeiten können.",
      th: "เลือกภาษาเป้าหมายแล้วแตะ Translate ข้อความถอดเสียงจะถูกแปลในที่เดิม คุณจึงยังแก้ไขผลลัพธ์ได้",
      vi: "Chọn ngôn ngữ đích rồi nhấn Translate. Bản ghi được dịch ngay tại chỗ, nên bạn vẫn có thể chỉnh sửa kết quả.",
      ar: "اختر لغة الهدف واضغط على ترجمة. تتم ترجمة النص في مكانه، حتى تتمكن من تعديل النتيجة.",
      tl: "Pumili ng target na wika at i-tap ang Translate. Isinasalin ang transcript sa mismong lugar, kaya maaari mo pa ring i-edit ang resulta.",
      it: "Scegli una lingua di destinazione e tocca Traduci. La trascrizione viene tradotta sul posto, quindi puoi comunque modificare il risultato.",
      he: "בחר שפת יעד והקש על תרגם. התמלול מתורגם במקום, כך שעדיין תוכל לערוך את התוצאה.",
    },
  },
  {
    title: {
      id: "4. Tambahkan lampiran (opsional)",
      en: "4. Add attachments (optional)",
      zh: "4. 添加附件（可选）",
      ja: "4. 添付ファイルを追加（任意）",
      ko: "4. 첨부 파일 추가(선택 사항)",
      hi: "4. अटैचमेंट जोड़ें (वैकल्पिक)",
      es: "4. Agregar archivos adjuntos (opcional)",
      fr: "4. Ajouter des pièces jointes (facultatif)",
      de: "4. Anhänge hinzufügen (optional)",
      th: "4. เพิ่มไฟล์แนบ (ไม่บังคับ)",
      vi: "4. Thêm tệp đính kèm (không bắt buộc)",
      ar: "4. إضافة مرفقات (اختياري)",
      tl: "4. Magdagdag ng attachment (opsyonal)",
      it: "4. Aggiungi allegati (facoltativo)",
      he: "4. הוסף קבצים מצורפים (אופציונלי)",
    },
    body: {
      id: "Gunakan Gallery atau Camera untuk foto — pilih Auto (AI) supaya caption-nya dibuatkan otomatis, atau Tulis manual untuk menulisnya sendiri. Gunakan File untuk melampirkan dokumen lain — ini selalu pakai deskripsi manual.",
      en: "Use Gallery or Camera for photos — choose Auto (AI) to have a caption written for you, or Tulis manual to write it yourself. Use File to attach any other document — these always use a manual description.",
      zh: "使用「相册」或「相机」添加照片 —— 选择 Auto (AI) 自动生成说明文字，或选择「手动撰写」自行输入。使用「文件」附加其他文档，这类附件始终需要手动描述。",
      ja: "写真は Gallery または Camera から追加します。Auto (AI) を選ぶとキャプションが自動作成され、Tulis manual を選ぶと自分で入力できます。他の書類は File で添付でき、常に手動の説明が必要です。",
      ko: "사진은 Gallery 또는 Camera를 사용하세요 — Auto (AI)를 선택하면 캡션이 자동 작성되고, Tulis manual을 선택하면 직접 작성할 수 있습니다. 다른 문서는 File로 첨부하며, 이 경우 항상 수동 설명이 필요합니다.",
      hi: "फ़ोटो के लिए Gallery या Camera का उपयोग करें — कैप्शन अपने आप लिखवाने के लिए Auto (AI) चुनें, या स्वयं लिखने के लिए Tulis manual चुनें। कोई अन्य दस्तावेज़ जोड़ने के लिए File का उपयोग करें — इनमें हमेशा मैन्युअल विवरण होता है।",
      es: "Use Galería o Cámara para fotos — elija Auto (IA) para que se escriba un pie de foto por usted, o Escribir manual para hacerlo usted mismo. Use Archivo para adjuntar cualquier otro documento — estos siempre usan una descripción manual.",
      fr: "Utilisez Galerie ou Appareil photo pour les photos — choisissez Auto (IA) pour qu'une légende soit rédigée pour vous, ou Écrire manuellement pour la rédiger vous-même. Utilisez Fichier pour joindre tout autre document — ceux-ci utilisent toujours une description manuelle.",
      de: "Verwenden Sie Galerie oder Kamera für Fotos — wählen Sie Auto (KI), damit eine Bildunterschrift für Sie geschrieben wird, oder Manuell schreiben, um sie selbst zu verfassen. Verwenden Sie Datei, um jedes andere Dokument anzuhängen — hierfür ist immer eine manuelle Beschreibung erforderlich.",
      th: "ใช้ Gallery หรือ Camera สำหรับรูปภาพ — เลือก Auto (AI) เพื่อให้เขียนคำบรรยายให้อัตโนมัติ หรือ Tulis manual เพื่อเขียนเอง ใช้ File เพื่อแนบเอกสารอื่น ๆ ซึ่งจะต้องใช้คำอธิบายแบบเขียนเองเสมอ",
      vi: "Dùng Gallery hoặc Camera cho ảnh — chọn Auto (AI) để chú thích được viết tự động, hoặc Tulis manual để tự viết. Dùng File để đính kèm tài liệu khác — loại này luôn cần mô tả thủ công.",
      ar: "استخدم المعرض أو الكاميرا للصور — اختر Auto (AI) لكتابة وصف تلقائيًا، أو Tulis manual لكتابته بنفسك. استخدم File لإرفاق أي مستند آخر — وهذه تتطلب دائمًا وصفًا يدويًا.",
      tl: "Gamitin ang Gallery o Camera para sa mga larawan — piliin ang Auto (AI) para awtomatikong masulatan ng caption, o Tulis manual para isulat ito mismo. Gamitin ang File para maglakip ng ibang dokumento — palaging manual ang paglalarawan dito.",
      it: "Usa Galleria o Fotocamera per le foto — scegli Auto (IA) per far scrivere una didascalia automaticamente, oppure Scrivi manualmente per farlo tu stesso. Usa File per allegare qualsiasi altro documento — questi richiedono sempre una descrizione manuale.",
      he: "השתמש בגלריה או במצלמה לתמונות — בחר Auto (AI) כדי שכיתוב ייכתב עבורך אוטומטית, או כתיבה ידנית כדי לכתוב בעצמך. השתמש בקובץ כדי לצרף כל מסמך אחר — אלה תמיד דורשים תיאור ידני.",
    },
  },
  {
    title: {
      id: "5. Kirim atau simpan",
      en: "5. Send or save",
      zh: "5. 发送或保存",
      ja: "5. 送信または保存",
      ko: "5. 전송 또는 저장",
      hi: "5. भेजें या सहेजें",
      es: "5. Enviar o guardar",
      fr: "5. Envoyer ou enregistrer",
      de: "5. Senden oder speichern",
      th: "5. ส่งหรือบันทึก",
      vi: "5. Gửi hoặc lưu",
      ar: "5. الإرسال أو الحفظ",
      tl: "5. Ipadala o i-save",
      it: "5. Invia o salva",
      he: "5. שלח או שמור",
    },
    body: {
      id: "Kirim memo langsung ke WhatsApp atau Email, bagikan lewat aplikasi apa pun di ponsel Anda, salin ke clipboard, atau unduh sebagai .txt, Word (.doc) atau PDF (lewat print).",
      en: "Send the memo straight to WhatsApp or Email, share it with any app on your phone, copy it to your clipboard, or download it as a .txt, Word (.doc) or PDF (via print).",
      zh: "直接将备忘录发送到 WhatsApp 或电子邮件，通过手机上的任意应用分享，复制到剪贴板，或下载为 .txt、Word（.doc）或 PDF（通过打印）。",
      ja: "メモは WhatsApp やメールへ直接送信できるほか、スマホの他のアプリで共有したり、クリップボードにコピーしたり、.txt・Word（.doc）・PDF（印刷経由）としてダウンロードできます。",
      ko: "메모를 WhatsApp이나 이메일로 바로 보내거나, 휴대폰의 다른 앱으로 공유하거나, 클립보드에 복사하거나, .txt·Word(.doc)·PDF(인쇄를 통해)로 다운로드할 수 있습니다.",
      hi: "मेमो सीधे WhatsApp या Email पर भेजें, अपने फ़ोन के किसी भी ऐप से शेयर करें, क्लिपबोर्ड पर कॉपी करें, या .txt, Word (.doc) या PDF (प्रिंट के ज़रिए) के रूप में डाउनलोड करें।",
      es: "Envíe el memo directamente a WhatsApp o Email, compártalo con cualquier app de su teléfono, cópielo al portapapeles, o descárguelo como .txt, Word (.doc) o PDF (mediante impresión).",
      fr: "Envoyez le mémo directement vers WhatsApp ou par e-mail, partagez-le avec n'importe quelle application de votre téléphone, copiez-le dans le presse-papiers, ou téléchargez-le en .txt, Word (.doc) ou PDF (via impression).",
      de: "Senden Sie das Memo direkt an WhatsApp oder per E-Mail, teilen Sie es mit einer beliebigen App auf Ihrem Telefon, kopieren Sie es in die Zwischenablage, oder laden Sie es als .txt, Word (.doc) oder PDF (über Drucken) herunter.",
      th: "ส่งบันทึกไปยัง WhatsApp หรืออีเมลโดยตรง แชร์ผ่านแอปใดก็ได้บนโทรศัพท์ของคุณ คัดลอกไปยังคลิปบอร์ด หรือดาวน์โหลดเป็น .txt, Word (.doc) หรือ PDF (ผ่านการพิมพ์)",
      vi: "Gửi ghi chú trực tiếp đến WhatsApp hoặc Email, chia sẻ qua bất kỳ ứng dụng nào trên điện thoại, sao chép vào clipboard, hoặc tải xuống dưới dạng .txt, Word (.doc) hoặc PDF (qua in).",
      ar: "أرسل المذكرة مباشرة إلى واتساب أو البريد الإلكتروني، أو شاركها عبر أي تطبيق على هاتفك، أو انسخها إلى الحافظة، أو نزّلها بصيغة ‎.txt أو Word (.doc) أو PDF (عبر الطباعة).",
      tl: "Ipadala ang memo direkta sa WhatsApp o Email, ibahagi ito sa anumang app sa iyong telepono, kopyahin sa clipboard, o i-download bilang .txt, Word (.doc) o PDF (sa pamamagitan ng print).",
      it: "Invia il memo direttamente a WhatsApp o Email, condividilo con qualsiasi app sul tuo telefono, copialo negli appunti, o scaricalo come .txt, Word (.doc) o PDF (tramite stampa).",
      he: "שלח את התזכיר ישירות ל-WhatsApp או לדוא\"ל, שתף אותו עם כל אפליקציה בטלפון שלך, העתק אותו ללוח, או הורד אותו כ-‎.txt, Word (.doc) או PDF (דרך הדפסה).",
    },
  },
  {
    title: {
      id: "Soal kredit",
      en: "About credits",
      zh: "关于额度",
      ja: "クレジットについて",
      ko: "크레딧 안내",
      hi: "क्रेडिट के बारे में",
      es: "Sobre los créditos",
      fr: "À propos des crédits",
      de: "Über Guthaben",
      th: "เกี่ยวกับเครดิต",
      vi: "Về tín dụng",
      ar: "حول الرصيد",
      tl: "Tungkol sa mga credit",
      it: "Informazioni sui crediti",
      he: "אודות הנקודות",
    },
    body: {
      id: "Transcribe, Translate dan Auto-caption memakai AI dan memotong kredit. Kalau kredit habis, Anda tetap bisa menulis semuanya secara manual gratis, atau top up kredit dari halaman Buy.",
      en: "Transcribe, Translate and Auto-caption use AI and cost credit. If you run out, you can still write everything manually for free, or top up credits from the Buy page.",
      zh: "转录、翻译和自动配文都会使用 AI 并消耗额度。额度用完后，您仍可免费手动完成所有操作，或从「购买」页面充值额度。",
      ja: "文字起こし・翻訳・自動キャプションは AI を使用しクレジットを消費します。クレジットがなくなっても、無料ですべて手動で入力できます。または Buy ページからクレジットを追加購入できます。",
      ko: "받아쓰기, 번역, 자동 캡션은 AI를 사용하며 크레딧이 소모됩니다. 크레딧이 떨어져도 모든 것을 무료로 직접 입력할 수 있으며, Buy 페이지에서 크레딧을 충전할 수도 있습니다.",
      hi: "Transcribe, Translate और Auto-caption AI का उपयोग करते हैं और क्रेडिट खर्च करते हैं। यदि क्रेडिट समाप्त हो जाए, तो भी आप सब कुछ मुफ़्त में मैन्युअल रूप से लिख सकते हैं, या Buy पेज से क्रेडिट टॉप-अप कर सकते हैं।",
      es: "Transcribir, Traducir y Auto-caption usan IA y consumen créditos. Si se agotan, puede seguir escribiendo todo manualmente de forma gratuita, o recargar créditos desde la página Buy.",
      fr: "Transcrire, Traduire et Auto-légende utilisent l'IA et consomment des crédits. Si vous n'en avez plus, vous pouvez toujours tout écrire manuellement gratuitement, ou recharger des crédits depuis la page Buy.",
      de: "Transkribieren, Übersetzen und Auto-Bildunterschrift nutzen KI und kosten Guthaben. Ist es aufgebraucht, können Sie weiterhin alles kostenlos manuell eingeben oder über die Buy-Seite Guthaben aufladen.",
      th: "Transcribe, Translate และ Auto-caption ใช้ AI และหักเครดิต หากเครดิตหมด คุณยังสามารถเขียนทุกอย่างด้วยตนเองได้ฟรี หรือเติมเครดิตได้จากหน้า Buy",
      vi: "Transcribe, Translate và Auto-caption dùng AI và tốn tín dụng. Nếu hết tín dụng, bạn vẫn có thể viết mọi thứ thủ công miễn phí, hoặc nạp thêm tín dụng từ trang Buy.",
      ar: "تستخدم ميزات التفريغ والترجمة والتعليق التلقائي الذكاء الاصطناعي وتستهلك رصيدًا. إذا نفد رصيدك، لا يزال بإمكانك كتابة كل شيء يدويًا مجانًا، أو شحن الرصيد من صفحة Buy.",
      tl: "Gumagamit ng AI ang Transcribe, Translate at Auto-caption at gumagastos ng credit. Kung maubos ito, maaari ka pa ring magsulat nang manu-mano nang libre, o mag-top up ng credit mula sa page ng Buy.",
      it: "Trascrivi, Traduci e Auto-didascalia usano l'IA e costano crediti. Se finiscono, puoi comunque scrivere tutto manualmente gratis, oppure ricaricare i crediti dalla pagina Buy.",
      he: "תמלול, תרגום וכיתוב אוטומטי משתמשים בבינה מלאכותית ועולים נקודות. אם נגמרות לך הנקודות, עדיין תוכל לכתוב הכול ידנית בחינם, או לטעון נקודות מדף Buy.",
    },
  },
];

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function HowToUsePage() {
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
        <p className="mt-1 text-sm text-muted-foreground">{t("tagline")}</p>
      </header>

      <div className="mx-auto max-w-2xl space-y-3 px-4 py-6">
        {steps.map((s) => (
          <Step key={s.title.en} title={s.title[lang]}>
            {s.body[lang]}
          </Step>
        ))}
      </div>
    </main>
  );
}
