export type InterfaceLanguage = "en" | "hi" | "ur";

export const GLOBAL_LANGUAGE_KEY = "zikr-global-language";
export const THEME_KEY = "zikr-interface-theme";
export const FONT_SCALE_KEY = "zikr-interface-font-scale";

const messages: Record<InterfaceLanguage, Record<string, string>> = {
  en: {
    Home: "Home", Lyrics: "Lyrics", Quran: "Quran", Audio: "Audio", Services: "Services",
    "E-Books": "E-Books", "About Us": "About Us", "Contact Us": "Contact Us",
    "Register / Login": "Register / Login", Search: "Search", Language: "Language",
    "Light theme": "Light theme", "Dark theme": "Dark theme", "Increase font size": "Increase font size",
    "Decrease font size": "Decrease font size", Explore: "Explore", Discover: "Discover",
    "Stay Connected": "Stay Connected", "Select lyric language": "Select lyric language",
    Share: "Share", "Related Audio": "Related Audio", Close: "Close",
    "Meaning not available": "Meaning not available", Loading: "Loading…", "Email address": "Email address",
    Subscribe: "Subscribe", Admin: "Admin", "All rights reserved": "All rights reserved",
    "Privacy and terms pages will be published before launch.": "Privacy and terms pages will be published before launch.",
    "Thank you. Subscription delivery requires backend connection.": "Thank you. Subscription delivery requires backend connection.",
    Browse: "Browse", "All Lyrics": "All Lyrics", Categories: "Categories", "Naat-Khwaan": "Naat-Khwaan",
    Poets: "Poets", Books: "Books", "Subject / Occasion": "Subject / Occasion", "Read Online": "Read Online",
    "Download PDF": "Download PDF", "Download unavailable": "Download unavailable", "Back to Lyrics": "Back to Lyrics",
    "View All Lyrics": "View All Lyrics", "Latest Lyrics": "Latest Lyrics", "Newly Added": "Newly Added",
    "Listen & Reflect": "Listen & Reflect", "Latest Devotional Audio": "Latest Devotional Audio",
    "Continue Exploring": "Continue Exploring", "Surahs of the Quran": "Surahs of the Quran",
    "View all 114 Surahs": "View all 114 Surahs", "Browse by Surah": "Browse by Surah", "Browse by Para": "Browse by Para",
    "Search by title, artist, writer...": "Search by title, artist, writer...",
    "Recently Published": "Recently Published", "Related Videos": "Related Videos", "Search lyric titles": "Search lyric titles", "Search audio or artist": "Search audio or artist", "Search books or authors": "Search books or authors",
    "Clear search": "Clear search", "Show password": "Show password", "Hide password": "Hide password", Portfolio: "Portfolio", Draft: "Draft", Published: "Published", Archived: "Archived",
    "New devotional works and thoughtful collections, shared with care.": "New devotional works and thoughtful collections, shared with care.",
    "Recited by": "Recited by", "Written by": "Written by", "Read Lyrics": "Read Lyrics", Featured: "Featured", Play: "Play", Playing: "Playing", Download: "Download", Pause: "Pause", "Audio progress": "Audio progress", Previous: "Previous", Next: "Next", "Clear filters": "Clear filters",
    "A SANCTUARY FOR THE HEART": "A SANCTUARY FOR THE HEART", "Find Peace in": "Find Peace in", Remembrance: "Remembrance", "of Allah": "of Allah",
    "THE HOLY QURAN": "THE HOLY QURAN", "Explore Devotional Content": "Explore Devotional Content", "Read the Quran": "Read the Quran", "View All Audio": "View All Audio",
    "Explore beautiful Naats, Quranic verses, devotional audio, and Islamic literature in one peaceful place.": "Explore beautiful Naats, Quranic verses, devotional audio, and Islamic literature in one peaceful place.",
    "Remember Allah often": "Remember Allah often", "The Holy Quran": "The Holy Quran", "Read Surahs with trusted translations": "Read Surahs with trusted translations",
    "Devotional Audio": "Devotional Audio", "Listen, reflect, and find peace": "Listen, reflect, and find peace", "A thoughtful Islamic digital library": "A thoughtful Islamic digital library",
    "Creative Services": "Creative Services", "Production for devotional creators": "Production for devotional creators", "READ • REFLECT • UNDERSTAND": "READ • REFLECT • UNDERSTAND",
    "Reconnect Through": "Reconnect Through", "the Holy Quran": "the Holy Quran", "Browse all Surahs and Paras with a serene reading experience and carefully presented translations.": "Browse all Surahs and Paras with a serene reading experience and carefully presented translations.",
    Surah: "Surah", Para: "Para", "Quranic Topics": "Quranic Topics", "Quranic Quotes": "Quranic Quotes", "Explore Quran": "Explore Quran",
    "Knowledge for the Soul": "Knowledge for the Soul", "Featured E-Books": "Featured E-Books", "Discover a curated library of Islamic literature.": "Discover a curated library of Islamic literature.", "Explore E-Books": "Explore E-Books",
    "Creative Studio": "Creative Studio", "Devotional content,": "Devotional content,", "beautifully crafted.": "beautifully crafted.", "From pristine audio to thoughtful visuals, we help creators share their message with clarity and care.": "From pristine audio to thoughtful visuals, we help creators share their message with clarity and care.", "View Our Services": "View Our Services",
    "Naat Mixing & Mastering": "Naat Mixing & Mastering", "Video Editing": "Video Editing", "Thumbnails & Posters": "Thumbnails & Posters", "Audio Distribution": "Audio Distribution", "YouTube Management": "YouTube Management",
    "BEGIN YOUR JOURNEY": "BEGIN YOUR JOURNEY", "Let every word bring": "Let every word bring", "your heart closer.": "your heart closer.", "Explore a peaceful collection made for remembrance and reflection.": "Explore a peaceful collection made for remembrance and reflection.", "Discover Zikr-e-Ilahi": "Discover Zikr-e-Ilahi",
  },
  hi: {
    Home: "होम", Lyrics: "लिरिक्स", Quran: "क़ुरआन", Audio: "ऑडियो", Services: "सेवाएँ",
    "E-Books": "ई-पुस्तकें", "About Us": "हमारे बारे में", "Contact Us": "संपर्क करें",
    "Register / Login": "रजिस्टर / लॉगिन", Search: "खोजें", Language: "भाषा",
    "Light theme": "लाइट थीम", "Dark theme": "डार्क थीम", "Increase font size": "फ़ॉन्ट बड़ा करें",
    "Decrease font size": "फ़ॉन्ट छोटा करें", Explore: "खोजें", Discover: "जानें",
    "Stay Connected": "जुड़े रहें", "Select lyric language": "लिरिक्स की भाषा चुनें",
    Share: "साझा करें", "Related Audio": "संबंधित ऑडियो", Close: "बंद करें",
    "Meaning not available": "अर्थ उपलब्ध नहीं", Loading: "लोड हो रहा है…", "Email address": "ईमेल पता",
    Subscribe: "सदस्यता लें", Admin: "व्यवस्थापक", "All rights reserved": "सर्वाधिकार सुरक्षित",
    "Privacy and terms pages will be published before launch.": "गोपनीयता और शर्तों के पृष्ठ शीघ्र प्रकाशित होंगे।",
    "Thank you. Subscription delivery requires backend connection.": "धन्यवाद। सदस्यता के लिए बैकएंड कनेक्शन आवश्यक है।",
    Browse: "ब्राउज़ करें", "All Lyrics": "सभी लिरिक्स", Categories: "श्रेणियाँ", "Naat-Khwaan": "नात-ख़्वाँ",
    Poets: "शायर", Books: "पुस्तकें", "Subject / Occasion": "विषय / अवसर", "Read Online": "ऑनलाइन पढ़ें",
    "Download PDF": "PDF डाउनलोड करें", "Download unavailable": "डाउनलोड उपलब्ध नहीं", "Back to Lyrics": "लिरिक्स पर लौटें",
    "View All Lyrics": "सभी लिरिक्स देखें", "Latest Lyrics": "नवीनतम लिरिक्स", "Newly Added": "नया जोड़ा गया",
    "Listen & Reflect": "सुनें और चिंतन करें", "Latest Devotional Audio": "नवीनतम भक्ति ऑडियो",
    "Continue Exploring": "आगे जानें", "Surahs of the Quran": "क़ुरआन की सूरतें",
    "View all 114 Surahs": "सभी 114 सूरतें देखें", "Browse by Surah": "सूरत के अनुसार देखें", "Browse by Para": "पारे के अनुसार देखें",
    "Search by title, artist, writer...": "शीर्षक, कलाकार या लेखक खोजें...",
    "Recently Published": "हाल ही में प्रकाशित", "Related Videos": "संबंधित वीडियो", "Search lyric titles": "लिरिक्स शीर्षक खोजें", "Search audio or artist": "ऑडियो या कलाकार खोजें", "Search books or authors": "पुस्तकें या लेखक खोजें",
    "Clear search": "खोज साफ़ करें", "Show password": "पासवर्ड दिखाएँ", "Hide password": "पासवर्ड छिपाएँ", Portfolio: "पोर्टफ़ोलियो", Draft: "ड्राफ़्ट", Published: "प्रकाशित", Archived: "संग्रहित",
    "New devotional works and thoughtful collections, shared with care.": "नई भक्ति रचनाएँ और विचारपूर्ण संग्रह, स्नेह के साथ।",
    "Recited by": "पाठ किया", "Written by": "रचना", "Read Lyrics": "लिरिक्स पढ़ें", Featured: "चुनिंदा", Play: "चलाएँ", Playing: "चल रहा है", Download: "डाउनलोड", Pause: "रोकें", "Audio progress": "ऑडियो प्रगति", Previous: "पिछला", Next: "अगला", "Clear filters": "फ़िल्टर हटाएँ",
    "A SANCTUARY FOR THE HEART": "दिल के लिए सुकून की जगह", "Find Peace in": "सुकून पाएँ", Remembrance: "याद में", "of Allah": "अल्लाह की",
    "THE HOLY QURAN": "पवित्र क़ुरआन", "Explore Devotional Content": "भक्ति सामग्री देखें", "Read the Quran": "क़ुरआन पढ़ें", "View All Audio": "सभी ऑडियो देखें",
    "Explore beautiful Naats, Quranic verses, devotional audio, and Islamic literature in one peaceful place.": "एक शांत जगह पर खूबसूरत नातें, क़ुरआनी आयतें, भक्ति ऑडियो और इस्लामी साहित्य देखें।",
    "Remember Allah often": "अल्लाह को अक्सर याद करें", "The Holy Quran": "पवित्र क़ुरआन", "Read Surahs with trusted translations": "विश्वसनीय अनुवाद के साथ सूरतें पढ़ें",
    "Devotional Audio": "भक्ति ऑडियो", "Listen, reflect, and find peace": "सुनें, मनन करें और सुकून पाएँ", "A thoughtful Islamic digital library": "इस्लामी साहित्य का विचारपूर्ण डिजिटल संग्रह",
    "Creative Services": "रचनात्मक सेवाएँ", "Production for devotional creators": "भक्ति रचनाकारों के लिए निर्माण सेवाएँ", "READ • REFLECT • UNDERSTAND": "पढ़ें • मनन करें • समझें",
    "Reconnect Through": "फिर से जुड़ें", "the Holy Quran": "पवित्र क़ुरआन से", "Browse all Surahs and Paras with a serene reading experience and carefully presented translations.": "शांत पठन अनुभव और सावधानी से प्रस्तुत अनुवादों के साथ सभी सूरतें और पारे देखें।",
    Surah: "सूरत", Para: "पारा", "Quranic Topics": "क़ुरआनी विषय", "Quranic Quotes": "क़ुरआनी उद्धरण", "Explore Quran": "क़ुरआन देखें",
    "Knowledge for the Soul": "आत्मा के लिए ज्ञान", "Featured E-Books": "चुनिंदा ई-पुस्तकें", "Discover a curated library of Islamic literature.": "इस्लामी साहित्य के चुने हुए संग्रह को देखें।", "Explore E-Books": "ई-पुस्तकें देखें",
    "Creative Studio": "रचनात्मक स्टूडियो", "Devotional content,": "भक्ति सामग्री,", "beautifully crafted.": "खूबसूरती से तैयार।", "From pristine audio to thoughtful visuals, we help creators share their message with clarity and care.": "बेहतरीन ऑडियो से विचारपूर्ण दृश्यों तक, हम रचनाकारों को अपना संदेश स्पष्टता और संवेदनशीलता से साझा करने में मदद करते हैं।", "View Our Services": "हमारी सेवाएँ देखें",
    "Naat Mixing & Mastering": "नात मिक्सिंग और मास्टरिंग", "Video Editing": "वीडियो संपादन", "Thumbnails & Posters": "थंबनेल और पोस्टर", "Audio Distribution": "ऑडियो वितरण", "YouTube Management": "YouTube प्रबंधन",
    "BEGIN YOUR JOURNEY": "अपनी यात्रा शुरू करें", "Let every word bring": "हर शब्द आपके", "your heart closer.": "दिल को करीब लाए।", "Explore a peaceful collection made for remembrance and reflection.": "याद और मनन के लिए तैयार शांत संग्रह देखें।", "Discover Zikr-e-Ilahi": "ज़िक्र-ए-इलाही को जानें",
  },
  ur: {
    Home: "صفحۂ اول", Lyrics: "کلام", Quran: "قرآن", Audio: "آڈیو", Services: "خدمات",
    "E-Books": "ای کتابیں", "About Us": "ہمارے بارے میں", "Contact Us": "رابطہ کریں",
    "Register / Login": "رجسٹر / لاگ اِن", Search: "تلاش", Language: "زبان",
    "Light theme": "لائٹ تھیم", "Dark theme": "ڈارک تھیم", "Increase font size": "حروف بڑے کریں",
    "Decrease font size": "حروف چھوٹے کریں", Explore: "دیکھیے", Discover: "دریافت کریں",
    "Stay Connected": "رابطے میں رہیں", "Select lyric language": "کلام کی زبان منتخب کریں",
    Share: "شیئر کریں", "Related Audio": "متعلقہ آڈیو", Close: "بند کریں",
    "Meaning not available": "معنی دستیاب نہیں", Loading: "لوڈ ہو رہا ہے…", "Email address": "ای میل پتہ",
    Subscribe: "سبسکرائب کریں", Admin: "منتظم", "All rights reserved": "جملہ حقوق محفوظ ہیں",
    "Privacy and terms pages will be published before launch.": "رازداری اور شرائط کے صفحات جلد شائع کیے جائیں گے۔",
    "Thank you. Subscription delivery requires backend connection.": "شکریہ۔ سبسکرپشن کے لیے بیک اینڈ کنکشن درکار ہے۔",
    Browse: "دیکھیے", "All Lyrics": "تمام کلام", Categories: "اقسام", "Naat-Khwaan": "نعت خواں",
    Poets: "شعرا", Books: "کتابیں", "Subject / Occasion": "موضوع / موقع", "Read Online": "آن لائن پڑھیں",
    "Download PDF": "PDF ڈاؤن لوڈ کریں", "Download unavailable": "ڈاؤن لوڈ دستیاب نہیں", "Back to Lyrics": "کلام پر واپس جائیں",
    "View All Lyrics": "تمام کلام دیکھیں", "Latest Lyrics": "تازہ کلام", "Newly Added": "نیا شامل شدہ",
    "Listen & Reflect": "سنیں اور غور کریں", "Latest Devotional Audio": "تازہ نعتیہ آڈیو",
    "Continue Exploring": "مزید دیکھیے", "Surahs of the Quran": "قرآن کی سورتیں",
    "View all 114 Surahs": "تمام 114 سورتیں دیکھیں", "Browse by Surah": "سورت کے لحاظ سے دیکھیں", "Browse by Para": "پارے کے لحاظ سے دیکھیں",
    "Search by title, artist, writer...": "عنوان، فنکار یا شاعر تلاش کریں...",
    "Recently Published": "حال ہی میں شائع شدہ", "Related Videos": "متعلقہ ویڈیوز", "Search lyric titles": "کلام کے عنوان تلاش کریں", "Search audio or artist": "آڈیو یا فنکار تلاش کریں", "Search books or authors": "کتابیں یا مصنفین تلاش کریں",
    "Clear search": "تلاش صاف کریں", "Show password": "پاس ورڈ دکھائیں", "Hide password": "پاس ورڈ چھپائیں", Portfolio: "پورٹ فولیو", Draft: "مسودہ", Published: "شائع شدہ", Archived: "محفوظ شدہ",
    "New devotional works and thoughtful collections, shared with care.": "نیا عقیدتی کلام اور بامعنی مجموعے، محبت کے ساتھ۔",
    "Recited by": "پڑھنے والے", "Written by": "تحریر", "Read Lyrics": "کلام پڑھیں", Featured: "منتخب", Play: "چلائیں", Playing: "چل رہا ہے", Download: "ڈاؤن لوڈ", Pause: "روکیں", "Audio progress": "آڈیو کی پیش رفت", Previous: "پچھلا", Next: "اگلا", "Clear filters": "فلٹر صاف کریں",
    "A SANCTUARY FOR THE HEART": "دل کے لیے سکون کی جگہ", "Find Peace in": "سکون پائیں", Remembrance: "یادِ", "of Allah": "اللہ میں",
    "THE HOLY QURAN": "قرآنِ کریم", "Explore Devotional Content": "عقیدتی مواد دیکھیں", "Read the Quran": "قرآن پڑھیں", "View All Audio": "تمام آڈیو دیکھیں",
    "Explore beautiful Naats, Quranic verses, devotional audio, and Islamic literature in one peaceful place.": "ایک پُرسکون جگہ پر خوبصورت نعتیں، قرآنی آیات، عقیدت بھرا آڈیو اور اسلامی ادب دریافت کریں۔",
    "Remember Allah often": "اللہ کو کثرت سے یاد کریں", "The Holy Quran": "قرآنِ کریم", "Read Surahs with trusted translations": "مستند تراجم کے ساتھ سورتیں پڑھیں",
    "Devotional Audio": "عقیدت بھرا آڈیو", "Listen, reflect, and find peace": "سنیں، غور کریں اور سکون پائیں", "A thoughtful Islamic digital library": "اسلامی ادب کا بامعنی ڈیجیٹل کتب خانہ",
    "Creative Services": "تخلیقی خدمات", "Production for devotional creators": "عقیدتی تخلیق کاروں کے لیے پروڈکشن", "READ • REFLECT • UNDERSTAND": "پڑھیں • غور کریں • سمجھیں",
    "Reconnect Through": "دوبارہ جڑیں", "the Holy Quran": "قرآنِ کریم سے", "Browse all Surahs and Paras with a serene reading experience and carefully presented translations.": "پُرسکون مطالعے اور اہتمام سے پیش کیے گئے تراجم کے ساتھ تمام سورتیں اور پارے دیکھیں۔",
    Surah: "سورت", Para: "پارہ", "Quranic Topics": "قرآنی موضوعات", "Quranic Quotes": "قرآنی اقتباسات", "Explore Quran": "قرآن دیکھیں",
    "Knowledge for the Soul": "روح کے لیے علم", "Featured E-Books": "منتخب ای کتابیں", "Discover a curated library of Islamic literature.": "اسلامی ادب کے منتخب کتب خانے کو دریافت کریں۔", "Explore E-Books": "ای کتابیں دیکھیں",
    "Creative Studio": "تخلیقی اسٹوڈیو", "Devotional content,": "عقیدتی مواد،", "beautifully crafted.": "خوبصورتی سے تیار۔", "From pristine audio to thoughtful visuals, we help creators share their message with clarity and care.": "بہترین آڈیو سے بامعنی بصری مواد تک، ہم تخلیق کاروں کو اپنا پیغام وضاحت اور خیال کے ساتھ پہنچانے میں مدد دیتے ہیں۔", "View Our Services": "ہماری خدمات دیکھیں",
    "Naat Mixing & Mastering": "نعت مکسنگ اور ماسٹرنگ", "Video Editing": "ویڈیو ایڈیٹنگ", "Thumbnails & Posters": "تھمب نیل اور پوسٹر", "Audio Distribution": "آڈیو کی تقسیم", "YouTube Management": "یوٹیوب مینجمنٹ",
    "BEGIN YOUR JOURNEY": "اپنا سفر شروع کریں", "Let every word bring": "ہر لفظ آپ کے", "your heart closer.": "دل کو قریب کرے۔", "Explore a peaceful collection made for remembrance and reflection.": "یاد اور غور و فکر کے لیے تیار پُرسکون مجموعہ دیکھیں۔", "Discover Zikr-e-Ilahi": "ذکرِ الٰہی دریافت کریں",
  },
};

Object.assign(messages.hi, {
  "REMEMBER • REFLECT • RISE": "याद करें • मनन करें • आगे बढ़ें", "Sign-in complete. Continue your pending action?": "साइन-इन पूरा हुआ। क्या आप लंबित कार्रवाई जारी रखना चाहते हैं?",
  Continue: "जारी रखें", Cancel: "रद्द करें", "ZIKR-E-ILAHI LIBRARY": "ज़िक्र-ए-इलाही पुस्तकालय", Volume: "खंड", All: "सभी",
  "Try another title or letter, or reset the filters.": "कोई अन्य शीर्षक या अक्षर आज़माएँ, या फ़िल्टर रीसेट करें।", No: "कोई", "match those filters.": "इन फ़िल्टर से मेल खाते।",
  "Try another search or letter.": "कोई अन्य खोज या अक्षर आज़माएँ।", "Try another title or letter, or return to the overview.": "कोई अन्य शीर्षक या अक्षर आज़माएँ, या सूची पर लौटें।",
  "Try another library category to continue browsing.": "ब्राउज़ करना जारी रखने के लिए कोई दूसरी श्रेणी चुनें।", titles: "शीर्षक", "No lyrics are currently published in this category.": "इस श्रेणी में अभी कोई लिरिक्स प्रकाशित नहीं हैं।",
  "This reciter is not currently linked to any published lyrics.": "इस पाठक से अभी कोई प्रकाशित लिरिक्स जुड़ी नहीं हैं।", "No published lyrics are currently attributed to this writer.": "इस लेखक के नाम से अभी कोई लिरिक्स प्रकाशित नहीं हैं।",
  "No published lyrics are currently linked to this book.": "इस पुस्तक से अभी कोई प्रकाशित लिरिक्स जुड़ी नहीं हैं।", "No lyrics are currently available in this language version.": "इस भाषा में अभी कोई लिरिक्स उपलब्ध नहीं हैं।",
  "No lyrics are available for this subject or occasion yet.": "इस विषय या अवसर के लिए अभी कोई लिरिक्स उपलब्ध नहीं हैं।", "Lyric not found": "लिरिक्स नहीं मिले",
  "The requested lyric is unavailable in the current library. Try browsing from the main Lyrics page.": "माँगे गए लिरिक्स इस संग्रह में उपलब्ध नहीं हैं। मुख्य लिरिक्स पृष्ठ से ब्राउज़ करें।",
  "Back to all lyrics": "सभी लिरिक्स पर लौटें", "and remembrance": "और स्मरण", "Select language": "भाषा चुनें", "Keywords:": "मुख्य शब्द:",
  "Related to": "संबंधित", Link: "लिंक", Available: "उपलब्ध", Video: "वीडियो", "YouTube reference": "YouTube संदर्भ", Shareable: "साझा करने योग्य", Watch: "देखें",
  "Explore every chapter in order": "हर अध्याय क्रम से देखें", "Read by Juz division": "पारे के अनुसार पढ़ें", Surahs: "सूरतें", "Ordered from Al-Fatihah to An-Nas": "अल-फ़ातिहा से अन-नास तक क्रम में",
  Juz: "पारा", "/ Hizb mapping unavailable": "/ हिज़्ब का मानचित्र उपलब्ध नहीं", "Verse by Verse": "आयत-दर-आयत", Reading: "पठन", "Translation:": "अनुवाद:", "Ayat • Local reader mock data": "आयतें • स्थानीय नमूना पाठ",
  Listen: "सुनें", Info: "जानकारी", "About this Surah": "इस सूरत के बारे में", Chapter: "अध्याय", "in canonical order": "मानक क्रम में", "revelation •": "अवतरित •", Ayat: "आयतें", "English meaning:": "अंग्रेज़ी अर्थ:",
  "Ayah numbering follows chapter metadata. Local text is available only for 1:1; other slots are intentionally left without Quran text or translation.": "आयतों की संख्या अध्याय के विवरण के अनुसार है। स्थानीय पाठ केवल 1:1 के लिए उपलब्ध है; अन्य स्थानों पर क़ुरआन का पाठ या अनुवाद उपलब्ध नहीं है।",
  "Quran text unavailable in the local mock data.": "स्थानीय नमूना डेटा में क़ुरआन का पाठ उपलब्ध नहीं है।", "Existing prototype sample • translation attribution not recorded": "मौजूदा नमूना • अनुवाद का श्रेय दर्ज नहीं है।",
  "Previous Surah": "पिछली सूरत", "All Surahs": "सभी सूरतें", "Next Surah": "अगली सूरत", "QURAN NAVIGATION": "क़ुरआन नेविगेशन", Verse: "आयत", Page: "पृष्ठ",
  "No Surahs match that search.": "इस खोज से कोई सूरत मेल नहीं खाती।", Ayah: "आयत", "Select a Juz to navigate to its listed starting Ayah.": "सूचीबद्ध शुरुआती आयत पर जाने के लिए पारा चुनें।", "Starts at": "शुरुआत",
  "Madani Mushaf sample mapping": "मदनी मुशफ़ का नमूना पृष्ठ-मानचित्र", "Only two local page-start mappings are included. This is not a complete page index.": "स्थानीय रूप से केवल दो पृष्ठ-आरंभ मानचित्र शामिल हैं। यह पूरी पृष्ठ-सूची नहीं है।",
  "DISPLAY SETTINGS": "प्रदर्शन सेटिंग", Translations: "अनुवाद", "No translations match that search.": "इस खोज से कोई अनुवाद मेल नहीं खाता।", Done: "पूर्ण",
  "No Para match that search.": "इस खोज से कोई पारा मेल नहीं खाता।", "Try a number, Juz name, or starting Surah reference.": "कोई संख्या, पारे का नाम या शुरुआती सूरत संदर्भ आज़माएँ।",
  "Curated references": "चुने हुए संदर्भ", "No Quran topic matches that search.": "इस खोज से क़ुरआन का कोई विषय मेल नहीं खाता।", "Try a different topic title or phrase.": "कोई दूसरा विषय या वाक्यांश आज़माएँ।",
  "Respectful by design": "सम्मान के साथ प्रस्तुत", "Quranic quotations will only be displayed after verification against authoritative source data and translation attribution.": "क़ुरआनी उद्धरण केवल प्रमाणित स्रोत-पाठ और अनुवाद श्रेय की पुष्टि के बाद दिखाए जाएँगे।",
  "No audio matches that search.": "इस खोज से कोई ऑडियो मेल नहीं खाता।", "Try another title, reciter name, or category filter.": "कोई दूसरा शीर्षक, पाठक का नाम या श्रेणी फ़िल्टर आज़माएँ।", "Audio not found": "ऑडियो नहीं मिला",
  "The selected devotional track is not available in this library.": "चुना गया भक्ति ट्रैक इस संग्रह में उपलब्ध नहीं है।", "Back to audio": "ऑडियो पर लौटें", PUBLISHED: "प्रकाशित", DURATION: "अवधि", "Download locked": "डाउनलोड के लिए लॉगिन करें",
  "ZIKR CREATIVE STUDIO": "ज़िक्र क्रिएटिव स्टूडियो", "Creative Services for": "के लिए रचनात्मक सेवाएँ", "Devotional Content": "भक्ति सामग्री", "Thoughtful production and visual craft for voices that inspire.": "प्रेरक आवाज़ों के लिए विचारपूर्ण निर्माण और दृश्य कला।", "Start a Conversation": "बातचीत शुरू करें",
  "Professional, respectful creative support tailored for Islamic devotional content and its audience.": "इस्लामी भक्ति सामग्री और उसके दर्शकों के लिए पेशेवर, सम्मानजनक रचनात्मक सहयोग।", "Get Service": "सेवा लें", "No books match that search or category.": "इस खोज या श्रेणी से कोई पुस्तक मेल नहीं खाती।",
  "Try another keyword or reset the filter to browse the latest titles.": "नवीनतम शीर्षक देखने के लिए कोई दूसरा शब्द आज़माएँ या फ़िल्टर रीसेट करें।", "Book not found": "पुस्तक नहीं मिली", "The selected publication is not available in the current library.": "चुना गया प्रकाशन इस संग्रह में उपलब्ध नहीं है।", "Back to library": "पुस्तकालय पर लौटें",
  LANGUAGE: "भाषा", FORMAT: "प्रारूप", ACCESS: "पहुँच", "About this book": "इस पुस्तक के बारे में", "← Back to library": "← पुस्तकालय पर लौटें", "Book unavailable": "पुस्तक उपलब्ध नहीं", "No reader content available.": "पठन सामग्री उपलब्ध नहीं है।", "The requested title is not currently open for reading.": "माँगा गया शीर्षक अभी पढ़ने के लिए उपलब्ध नहीं है।",
  "← Return to book": "← पुस्तक पर लौटें", "Full screen": "पूर्ण स्क्रीन", "Author:": "लेखक:", "Category:": "श्रेणी:", "Sample page": "नमूना पृष्ठ", "← Previous": "← पिछला", of: "में से", "Next →": "अगला →",
  "ABOUT ZIKR-E-ILAHI": "ज़िक्र-ए-इलाही के बारे में", "A peaceful home for": "एक शांत स्थान", "devotional discovery.": "भक्ति की खोज के लिए।", "Zikr-e-Ilahi is envisioned as an accessible digital space where devotional words, recitations, literature, and creative work can be explored with care.": "ज़िक्र-ए-इलाही एक सहज डिजिटल स्थान है जहाँ भक्ति के शब्दों, पाठ, साहित्य और रचनात्मक कार्यों को सम्मानपूर्वक देखा जा सकता है।",
  "OUR PURPOSE": "हमारा उद्देश्य", "Created to make remembrance feel closer.": "स्मरण को और निकट लाने के लिए बनाया गया।", "Our mission is to present Islamic devotional content in a calm, respectful, and readable environment. This copy is intentionally editable until the organization’s verified story and details are provided.": "हमारा उद्देश्य इस्लामी भक्ति सामग्री को शांत, सम्मानजनक और पठनीय रूप में प्रस्तुत करना है। संस्था की प्रमाणित जानकारी मिलने तक यह विवरण संपादन योग्य है।",
  Mission: "मिशन", "Make trusted devotional content easier to discover and experience.": "विश्वसनीय भक्ति सामग्री को खोजना और अनुभव करना सरल बनाना।", Vision: "दृष्टि", "A welcoming digital destination that nurtures reflection and learning.": "मनन और सीख को बढ़ावा देने वाला स्वागतयोग्य डिजिटल स्थान।",
  "Start a conversation": "बातचीत शुरू करें", "Use the form and the team can respond through the eventual contact workflow. Verified email and social links will be added before launch.": "फ़ॉर्म भेजें; टीम उपलब्ध संपर्क प्रक्रिया से उत्तर देगी। सत्यापित ईमेल और सोशल लिंक लॉन्च से पहले जोड़े जाएँगे।",
  EMAIL: "ईमेल", "Contact details coming soon": "संपर्क विवरण जल्द आएँगे", "Message received": "संदेश प्राप्त हुआ", "This prototype demonstrates the success state. Backend delivery will be connected later.": "यह प्रोटोटाइप सफलता की स्थिति दिखाता है। संदेश भेजने की बैकएंड सुविधा बाद में जुड़ेगी।",
  "Send another": "एक और संदेश भेजें", Message: "संदेश", "How can we help?": "हम आपकी क्या सहायता कर सकते हैं?", "Please complete your name, email, and message.": "कृपया अपना नाम, ईमेल और संदेश भरें।", "Send Message": "संदेश भेजें",
  Password: "पासवर्ड", "Enter your password": "अपना पासवर्ड दर्ज करें", "QURAN 13:28": "क़ुरआन 13:28",
  "CONTENT ADMIN": "सामग्री व्यवस्थापक", ADMINISTRATION: "प्रशासन", "← Dashboard": "← डैशबोर्ड", "Save Draft": "ड्राफ़्ट सहेजें", "Draft preview": "ड्राफ़्ट पूर्वावलोकन", "Lyrics preview appears here as editors type and format content.": "संपादक के लिखते और स्वरूपित करते समय लिरिक्स का पूर्वावलोकन यहाँ दिखेगा।",
  "Content details": "सामग्री विवरण", "Create, edit, preview, publish, or archive library content. Fields adapt to the selected content type during backend integration.": "पुस्तकालय सामग्री बनाएँ, संपादित करें, देखें, प्रकाशित करें या संग्रहित करें। बैकएंड जुड़ने पर फ़ील्ड चुने गए प्रकार के अनुसार होंगे।",
  "Content type": "सामग्री का प्रकार", Status: "स्थिति", "Lyrics content": "लिरिक्स सामग्री", Classification: "वर्गीकरण", Category: "श्रेणी", "Quran source content is protected through a separate verified workflow.": "क़ुरआन स्रोत सामग्री अलग सत्यापित प्रक्रिया से सुरक्षित रखी जाती है।",
  "Recent uploads": "हाल के अपलोड", "Latest activity across the library": "पुस्तकालय की हाल की गतिविधि", "Add Content": "सामग्री जोड़ें", Content: "सामग्री", Type: "प्रकार", Published: "प्रकाशित",
  "A peaceful digital home for Islamic devotional content, reflection, and creative expression.": "इस्लामी भक्ति सामग्री, मनन और रचनात्मक अभिव्यक्ति के लिए एक शांत डिजिटल स्थान।", "Social links will appear once official profiles are verified.": "आधिकारिक प्रोफ़ाइल सत्यापित होने के बाद सोशल लिंक दिखेंगे।",
  "← Previous Surah": "← पिछली सूरत", "Next Surah →": "अगली सूरत →",
  "Devotional Lyrics": "भक्ति लिरिक्स", "Discover words of praise and devotion across languages, traditions, and beloved voices.": "विभिन्न भाषाओं और परंपराओं में प्रशंसा और भक्ति के शब्द खोजें।",
  "Browse devotional compositions by their form and tradition.": "भक्ति रचनाओं को उनके रूप और परंपरा के अनुसार देखें।", "Naat-Khwaan / Reciters": "नातख़्वाँ / पाठक", "Explore lyrics by the voice that recites them.": "पाठ करने वाली आवाज़ के अनुसार लिरिक्स देखें।",
  "Poets / Writers": "कवि / लेखक", "Browse lyrics by the writer credited with the composition.": "रचना के श्रेयित लेखक के अनुसार लिरिक्स देखें।", "Browse lyrics linked to a source collection or devotional anthology.": "स्रोत संग्रह या भक्ति संकलन से जुड़े लिरिक्स देखें।",
  "Find lyrics by the language version available in the library.": "पुस्तकालय में उपलब्ध भाषा संस्करण के अनुसार लिरिक्स खोजें।", "Find lyrics connected to the event, place, or remembrance theme they celebrate.": "उत्सव, स्थान या स्मरण के विषय से जुड़े लिरिक्स खोजें।",
  "Read All Lyrics": "सभी लिरिक्स पढ़ें", "Read. Reflect. Return.": "पढ़ें। मनन करें। लौटें।", "A calm and respectful space to explore the Quran, Surah by Surah.": "सूरत-दर-सूरत क़ुरआन देखने के लिए एक शांत और सम्मानजनक स्थान।",
  "Browse all 114 Surahs of the Holy Quran in their established order.": "पवित्र क़ुरआन की सभी 114 सूरतें निर्धारित क्रम में देखें।", "Browse the Holy Quran through its 30 traditional Juz divisions.": "पवित्र क़ुरआन को उसके 30 पारंपरिक पारा विभाजनों के अनुसार देखें।",
  "Quranic Topics & Quotes": "क़ुरआनी विषय और उद्धरण", "Explore an editorial index designed to guide thoughtful study. Published content must use verified source text and attribution.": "विचारपूर्ण अध्ययन के लिए तैयार विषय-सूची देखें। प्रकाशित सामग्री प्रमाणित स्रोत-पाठ और श्रेय पर आधारित होनी चाहिए।",
  "Listen to soulful recitations, Naats, Hamd, and timeless devotional works.": "दिल को छूने वाले पाठ, नात, हम्द और कालजयी भक्ति रचनाएँ सुनें।", "Latest Audio": "नवीनतम ऑडियो",
  "Made with care. Built to resonate.": "स्नेह से रचा, दिल तक पहुँचने वाला।", "A glimpse at devotional projects crafted with purpose.": "उद्देश्य के साथ तैयार भक्ति परियोजनाओं की एक झलक।",
  "Islamic E-Books Library": "इस्लामी ई-पुस्तकालय", "A considered collection of devotional literature for reading, reflection, and learning.": "पठन, मनन और सीखने के लिए भक्ति साहित्य का चुना हुआ संग्रह।", "Latest Uploads": "नवीनतम अपलोड",
  "GET IN TOUCH": "संपर्क करें", "We'd love to hear from you.": "हम आपसे सुनना चाहेंगे।", "Questions, requests, and creative enquiries are all welcome.": "प्रश्न, अनुरोध और रचनात्मक पूछताछ का स्वागत है।",
  Name: "नाम", Email: "ईमेल", Subject: "विषय", "Full Name": "पूरा नाम", "Email or Username": "ईमेल या उपयोगकर्ता नाम", "Confirm Password": "पासवर्ड की पुष्टि करें", "Remember me": "मुझे याद रखें", "I accept the Terms and Privacy Policy": "मैं नियम और गोपनीयता नीति स्वीकार करता/करती हूँ",
  "WELCOME BACK": "वापसी पर स्वागत है", "JOIN THE COMMUNITY": "समुदाय से जुड़ें", "Sign in to your account": "अपने खाते में साइन इन करें", "Create your account": "अपना खाता बनाएँ", "A peaceful place to continue your journey.": "अपनी यात्रा जारी रखने का शांत स्थान।", "Begin your personal journey with Zikr-e-Ilahi.": "ज़िक्र-ए-इलाही के साथ अपनी निजी यात्रा शुरू करें।", "Sign In": "साइन इन", "Create Account": "खाता बनाएँ", "New to Zikr-e-Ilahi?": "ज़िक्र-ए-इलाही पर नए हैं?", "Already have an account?": "पहले से खाता है?", "Create account": "खाता बनाएँ", "Sign in": "साइन इन", "Login to download": "डाउनलोड के लिए लॉगिन करें", "Login required to download": "डाउनलोड के लिए लॉगिन आवश्यक है",
  "Search lyric titles": "लिरिक्स शीर्षक खोजें", "Search audio or artist": "ऑडियो या कलाकार खोजें", "Search books or authors": "पुस्तकें या लेखक खोजें", "New devotional works and thoughtful collections, shared with care.": "नई भक्ति रचनाएँ और विचारपूर्ण संग्रह, स्नेह के साथ।",
  "Your email address": "आपका ईमेल पता", "Enter your name": "अपना नाम दर्ज करें", "Enter your email": "अपना ईमेल दर्ज करें", "Enter your subject": "अपना विषय दर्ज करें", "Enter your full name": "अपना पूरा नाम दर्ज करें", "Enter your email or username": "अपना ईमेल या उपयोगकर्ता नाम दर्ज करें", "Enter your confirm password": "पासवर्ड की पुष्टि दर्ज करें",
  Management: "प्रबंधन", "Good morning, Editor": "सुप्रभात, संपादक",
});

Object.assign(messages.ur, {
  "REMEMBER • REFLECT • RISE": "یاد • غور • ترقی", "Sign-in complete. Continue your pending action?": "سائن اِن مکمل ہو گیا۔ کیا آپ زیرِ التوا کارروائی جاری رکھنا چاہتے ہیں؟",
  Continue: "جاری رکھیں", Cancel: "منسوخ کریں", "ZIKR-E-ILAHI LIBRARY": "ذکرِ الٰہی کتب خانہ", Volume: "جلد", All: "تمام",
  "Try another title or letter, or reset the filters.": "کوئی اور عنوان یا حرف آزمائیں، یا فلٹر دوبارہ ترتیب دیں۔", No: "کوئی", "match those filters.": "ان فلٹرز سے مطابقت نہیں رکھتا۔",
  "Try another search or letter.": "کوئی اور تلاش یا حرف آزمائیں۔", "Try another title or letter, or return to the overview.": "کوئی اور عنوان یا حرف آزمائیں، یا فہرست پر واپس جائیں۔",
  "Try another library category to continue browsing.": "مزید دیکھنے کے لیے کتب خانے کی کوئی اور قسم منتخب کریں۔", titles: "عنوانات", "No lyrics are currently published in this category.": "اس قسم میں فی الحال کوئی کلام شائع نہیں ہوا۔",
  "This reciter is not currently linked to any published lyrics.": "اس نعت خواں سے فی الحال کوئی شائع شدہ کلام منسلک نہیں۔", "No published lyrics are currently attributed to this writer.": "اس شاعر کے نام سے فی الحال کوئی کلام شائع نہیں۔",
  "No published lyrics are currently linked to this book.": "اس کتاب سے فی الحال کوئی شائع شدہ کلام منسلک نہیں۔", "No lyrics are currently available in this language version.": "اس زبان میں فی الحال کوئی کلام دستیاب نہیں۔",
  "No lyrics are available for this subject or occasion yet.": "اس موضوع یا موقع کے لیے ابھی کوئی کلام دستیاب نہیں۔", "Lyric not found": "کلام نہیں ملا",
  "The requested lyric is unavailable in the current library. Try browsing from the main Lyrics page.": "درخواست کردہ کلام موجودہ کتب خانے میں دستیاب نہیں۔ مرکزی کلام کے صفحے سے تلاش کریں۔",
  "Back to all lyrics": "تمام کلام پر واپس جائیں", "and remembrance": "اور یاد", "Select language": "زبان منتخب کریں", "Keywords:": "کلیدی الفاظ:",
  "Related to": "متعلق", Link: "لنک", Available: "دستیاب", Video: "ویڈیو", "YouTube reference": "یوٹیوب حوالہ", Shareable: "قابلِ اشتراک", Watch: "دیکھیں",
  "Explore every chapter in order": "تمام ابواب ترتیب سے دیکھیں", "Read by Juz division": "پارے کے مطابق پڑھیں", Surahs: "سورتیں", "Ordered from Al-Fatihah to An-Nas": "الفاتحہ سے الناس تک ترتیب وار",
  Juz: "پارہ", "/ Hizb mapping unavailable": "/ حزب کی ترتیب دستیاب نہیں", "Verse by Verse": "آیت بہ آیت", Reading: "مطالعہ", "Translation:": "ترجمہ:", "Ayat • Local reader mock data": "آیات • مقامی نمونہ متن",
  Listen: "سنیں", Info: "معلومات", "About this Surah": "اس سورت کے بارے میں", Chapter: "باب", "in canonical order": "ترتیبِ مصحف میں", "revelation •": "نزول •", Ayat: "آیات", "English meaning:": "انگریزی معنی:",
  "Ayah numbering follows chapter metadata. Local text is available only for 1:1; other slots are intentionally left without Quran text or translation.": "آیات کی گنتی باب کے ریکارڈ کے مطابق ہے۔ مقامی متن صرف 1:1 کے لیے ہے؛ دیگر مقامات پر قرآنی متن یا ترجمہ دستیاب نہیں۔",
  "Quran text unavailable in the local mock data.": "مقامی نمونہ ڈیٹا میں قرآنی متن دستیاب نہیں۔", "Existing prototype sample • translation attribution not recorded": "موجودہ نمونہ • مترجم کا حوالہ درج نہیں۔",
  "Previous Surah": "پچھلی سورت", "All Surahs": "تمام سورتیں", "Next Surah": "اگلی سورت", "QURAN NAVIGATION": "قرآن نیویگیشن", Verse: "آیت", Page: "صفحہ",
  "No Surahs match that search.": "اس تلاش سے کوئی سورت مطابقت نہیں رکھتی۔", Ayah: "آیت", "Select a Juz to navigate to its listed starting Ayah.": "درج شدہ ابتدائی آیت پر جانے کے لیے پارہ منتخب کریں۔", "Starts at": "آغاز",
  "Madani Mushaf sample mapping": "مدنی مصحف کا نمونہ صفحہ نقشہ", "Only two local page-start mappings are included. This is not a complete page index.": "مقامی طور پر صرف دو صفحات کے آغاز شامل ہیں۔ یہ مکمل اشاریہ نہیں۔",
  "DISPLAY SETTINGS": "ظاہری ترتیبات", Translations: "تراجم", "No translations match that search.": "اس تلاش سے کوئی ترجمہ مطابقت نہیں رکھتا۔", Done: "مکمل",
  "No Para match that search.": "اس تلاش سے کوئی پارہ مطابقت نہیں رکھتا۔", "Try a number, Juz name, or starting Surah reference.": "کوئی نمبر، پارے کا نام یا ابتدائی سورت کا حوالہ آزمائیں۔",
  "Curated references": "منتخب حوالہ جات", "No Quran topic matches that search.": "اس تلاش سے قرآن کا کوئی موضوع مطابقت نہیں رکھتا۔", "Try a different topic title or phrase.": "کوئی اور موضوع یا عبارت آزمائیں۔",
  "Respectful by design": "احترام کے ساتھ پیش کردہ", "Quranic quotations will only be displayed after verification against authoritative source data and translation attribution.": "قرآنی اقتباسات مستند ماخذ اور ترجمے کے حوالہ کی تصدیق کے بعد ہی دکھائے جائیں گے۔",
  "No audio matches that search.": "اس تلاش سے کوئی آڈیو مطابقت نہیں رکھتا۔", "Try another title, reciter name, or category filter.": "کوئی اور عنوان، نعت خواں کا نام یا قسم کا فلٹر آزمائیں۔", "Audio not found": "آڈیو نہیں ملا",
  "The selected devotional track is not available in this library.": "منتخب عقیدتی ٹریک اس کتب خانے میں دستیاب نہیں۔", "Back to audio": "آڈیو پر واپس جائیں", PUBLISHED: "اشاعت", DURATION: "دورانیہ", "Download locked": "ڈاؤن لوڈ کے لیے سائن اِن کریں",
  "ZIKR CREATIVE STUDIO": "ذکر کریئیٹو اسٹوڈیو", "Creative Services for": "کے لیے تخلیقی خدمات", "Devotional Content": "عقیدتی مواد", "Thoughtful production and visual craft for voices that inspire.": "حوصلہ دینے والی آوازوں کے لیے بامعنی پروڈکشن اور بصری فن۔", "Start a Conversation": "بات چیت شروع کریں",
  "Professional, respectful creative support tailored for Islamic devotional content and its audience.": "اسلامی عقیدتی مواد اور اس کے سامعین کے لیے پیشہ ورانہ اور باوقار تخلیقی معاونت۔", "Get Service": "خدمت حاصل کریں", "No books match that search or category.": "اس تلاش یا قسم سے کوئی کتاب مطابقت نہیں رکھتی۔",
  "Try another keyword or reset the filter to browse the latest titles.": "تازہ عنوانات دیکھنے کے لیے کوئی اور لفظ آزمائیں یا فلٹر صاف کریں۔", "Book not found": "کتاب نہیں ملی", "The selected publication is not available in the current library.": "منتخب اشاعت موجودہ کتب خانے میں دستیاب نہیں۔", "Back to library": "کتب خانے پر واپس جائیں",
  LANGUAGE: "زبان", FORMAT: "فارمیٹ", ACCESS: "رسائی", "About this book": "اس کتاب کے بارے میں", "← Back to library": "← کتب خانے پر واپس جائیں", "Book unavailable": "کتاب دستیاب نہیں", "No reader content available.": "مطالعے کا مواد دستیاب نہیں۔", "The requested title is not currently open for reading.": "درخواست کردہ عنوان فی الحال مطالعے کے لیے دستیاب نہیں۔",
  "← Return to book": "← کتاب پر واپس جائیں", "Full screen": "مکمل اسکرین", "Author:": "مصنف:", "Category:": "قسم:", "Sample page": "نمونہ صفحہ", "← Previous": "← پچھلا", of: "میں سے", "Next →": "اگلا →",
  "ABOUT ZIKR-E-ILAHI": "ذکرِ الٰہی کے بارے میں", "A peaceful home for": "ایک پُرسکون جگہ", "devotional discovery.": "عقیدت کی دریافت کے لیے۔", "Zikr-e-Ilahi is envisioned as an accessible digital space where devotional words, recitations, literature, and creative work can be explored with care.": "ذکرِ الٰہی ایک آسان ڈیجیٹل جگہ ہے جہاں عقیدتی کلام، تلاوت، ادب اور تخلیقی کام کو توجہ سے دیکھا جا سکتا ہے۔",
  "OUR PURPOSE": "ہمارا مقصد", "Created to make remembrance feel closer.": "یاد کو قریب محسوس کرانے کے لیے بنایا گیا۔", "Our mission is to present Islamic devotional content in a calm, respectful, and readable environment. This copy is intentionally editable until the organization’s verified story and details are provided.": "ہمارا مقصد اسلامی عقیدتی مواد کو پُرسکون، باوقار اور قابلِ مطالعہ ماحول میں پیش کرنا ہے۔ ادارے کی مصدقہ معلومات آنے تک یہ عبارت قابلِ ترمیم ہے۔",
  Mission: "مشن", "Make trusted devotional content easier to discover and experience.": "مستند عقیدتی مواد کی تلاش اور تجربے کو آسان بنانا۔", Vision: "تصور", "A welcoming digital destination that nurtures reflection and learning.": "غور و فکر اور سیکھنے کو فروغ دینے والی خوش آمدیدی ڈیجیٹل منزل۔",
  "Start a conversation": "بات چیت شروع کریں", "Use the form and the team can respond through the eventual contact workflow. Verified email and social links will be added before launch.": "فارم استعمال کریں؛ ٹیم دستیاب رابطہ طریقے سے جواب دے گی۔ مصدقہ ای میل اور سوشل روابط اجرا سے پہلے شامل ہوں گے۔",
  EMAIL: "ای میل", "Contact details coming soon": "رابطے کی تفصیل جلد دستیاب ہوگی", "Message received": "پیغام موصول ہوا", "This prototype demonstrates the success state. Backend delivery will be connected later.": "یہ نمونہ کامیابی کی حالت دکھاتا ہے۔ پیغام بھیجنے کا بیک اینڈ بعد میں منسلک ہوگا۔",
  "Send another": "ایک اور پیغام بھیجیں", Message: "پیغام", "How can we help?": "ہم آپ کی کیا مدد کر سکتے ہیں؟", "Please complete your name, email, and message.": "اپنا نام، ای میل اور پیغام مکمل کریں۔", "Send Message": "پیغام بھیجیں",
  Password: "پاس ورڈ", "Enter your password": "اپنا پاس ورڈ درج کریں", "QURAN 13:28": "قرآن 13:28",
  "CONTENT ADMIN": "مواد کا منتظم", ADMINISTRATION: "انتظامیہ", "← Dashboard": "← ڈیش بورڈ", "Save Draft": "مسودہ محفوظ کریں", "Draft preview": "مسودے کا پیش منظر", "Lyrics preview appears here as editors type and format content.": "مدیر کے لکھنے اور ترتیب دینے کے ساتھ کلام کا پیش منظر یہاں دکھے گا۔",
  "Content details": "مواد کی تفصیل", "Create, edit, preview, publish, or archive library content. Fields adapt to the selected content type during backend integration.": "کتب خانے کا مواد بنائیں، ترمیم کریں، پیش منظر دیکھیں، شائع کریں یا محفوظ کریں۔ بیک اینڈ کے بعد خانے منتخب قسم کے مطابق ہوں گے۔",
  "Content type": "مواد کی قسم", Status: "حالت", "Lyrics content": "کلام کا مواد", Classification: "درجہ بندی", Category: "قسم", "Quran source content is protected through a separate verified workflow.": "قرآن کا ماخذی مواد الگ مصدقہ طریقۂ کار سے محفوظ ہے۔",
  "Recent uploads": "حالیہ اپ لوڈز", "Latest activity across the library": "کتب خانے کی تازہ سرگرمی", "Add Content": "مواد شامل کریں", Content: "مواد", Type: "قسم", Published: "شائع شدہ",
  "A peaceful digital home for Islamic devotional content, reflection, and creative expression.": "اسلامی عقیدتی مواد، غور و فکر اور تخلیقی اظہار کے لیے ایک پُرسکون ڈیجیٹل گھر۔", "Social links will appear once official profiles are verified.": "سرکاری پروفائلز کی تصدیق کے بعد سوشل روابط دکھائے جائیں گے۔",
  "← Previous Surah": "← پچھلی سورت", "Next Surah →": "اگلی سورت →",
  "Devotional Lyrics": "عقیدتی کلام", "Discover words of praise and devotion across languages, traditions, and beloved voices.": "مختلف زبانوں اور روایات میں حمد و عقیدت کے کلام دریافت کریں۔",
  "Browse devotional compositions by their form and tradition.": "عقیدتی کلام کو ان کی صنف اور روایت کے مطابق دیکھیں۔", "Naat-Khwaan / Reciters": "نعت خواں / قاری", "Explore lyrics by the voice that recites them.": "کلام پڑھنے والی آواز کے مطابق کلام دیکھیں۔",
  "Poets / Writers": "شعرا / مصنفین", "Browse lyrics by the writer credited with the composition.": "کلام کے مصنف کے مطابق کلام دیکھیں۔", "Browse lyrics linked to a source collection or devotional anthology.": "ماخذی مجموعے یا عقیدتی انتخاب سے منسلک کلام دیکھیں۔",
  "Find lyrics by the language version available in the library.": "کتب خانے میں دستیاب زبان کے مطابق کلام تلاش کریں۔", "Find lyrics connected to the event, place, or remembrance theme they celebrate.": "تقریب، مقام یا یاد کے موضوع سے متعلق کلام تلاش کریں۔",
  "Read All Lyrics": "تمام کلام پڑھیں", "Read. Reflect. Return.": "پڑھیں۔ غور کریں۔ لوٹیں۔", "A calm and respectful space to explore the Quran, Surah by Surah.": "قرآن کو سورت بہ سورت دیکھنے کے لیے ایک پُرسکون اور باوقار جگہ۔",
  "Browse all 114 Surahs of the Holy Quran in their established order.": "قرآنِ کریم کی تمام 114 سورتیں مقررہ ترتیب سے دیکھیں۔", "Browse the Holy Quran through its 30 traditional Juz divisions.": "قرآنِ کریم کو اس کے 30 روایتی پاروں کے مطابق دیکھیں۔",
  "Quranic Topics & Quotes": "قرآنی موضوعات اور اقتباسات", "Explore an editorial index designed to guide thoughtful study. Published content must use verified source text and attribution.": "بامعنی مطالعے کے لیے مرتب موضوعاتی فہرست دیکھیں۔ شائع شدہ مواد مستند متن اور حوالہ پر مبنی ہوگا۔",
  "Listen to soulful recitations, Naats, Hamd, and timeless devotional works.": "دل نشیں تلاوت، نعت، حمد اور لازوال عقیدتی کلام سنیں۔", "Latest Audio": "تازہ آڈیو",
  "Made with care. Built to resonate.": "محبت سے تخلیق، دل تک رسائی۔", "A glimpse at devotional projects crafted with purpose.": "مقصد کے ساتھ تیار کردہ عقیدتی منصوبوں کی ایک جھلک۔",
  "Islamic E-Books Library": "اسلامی ای کتب خانہ", "A considered collection of devotional literature for reading, reflection, and learning.": "مطالعے، غور و فکر اور سیکھنے کے لیے عقیدتی ادب کا منتخب مجموعہ۔", "Latest Uploads": "تازہ اپ لوڈز",
  "GET IN TOUCH": "رابطہ کریں", "We'd love to hear from you.": "ہم آپ سے سننا چاہیں گے۔", "Questions, requests, and creative enquiries are all welcome.": "سوالات، درخواستوں اور تخلیقی تجاویز کا خیرمقدم ہے۔",
  Name: "نام", Email: "ای میل", Subject: "موضوع", "Full Name": "پورا نام", "Email or Username": "ای میل یا صارف نام", "Confirm Password": "پاس ورڈ کی تصدیق", "Remember me": "مجھے یاد رکھیں", "I accept the Terms and Privacy Policy": "میں شرائط اور رازداری کی پالیسی قبول کرتا/کرتی ہوں",
  "WELCOME BACK": "واپسی پر خوش آمدید", "JOIN THE COMMUNITY": "برادری میں شامل ہوں", "Sign in to your account": "اپنے اکاؤنٹ میں سائن اِن کریں", "Create your account": "اپنا اکاؤنٹ بنائیں", "A peaceful place to continue your journey.": "اپنا سفر جاری رکھنے کے لیے پُرسکون جگہ۔", "Begin your personal journey with Zikr-e-Ilahi.": "ذکرِ الٰہی کے ساتھ اپنا ذاتی سفر شروع کریں۔", "Sign In": "سائن اِن", "Create Account": "اکاؤنٹ بنائیں", "New to Zikr-e-Ilahi?": "ذکرِ الٰہی پر نئے ہیں؟", "Already have an account?": "پہلے سے اکاؤنٹ ہے؟", "Create account": "اکاؤنٹ بنائیں", "Sign in": "سائن اِن", "Login to download": "ڈاؤن لوڈ کے لیے لاگ اِن کریں", "Login required to download": "ڈاؤن لوڈ کے لیے لاگ اِن ضروری ہے",
  "Search lyric titles": "کلام کے عنوان تلاش کریں", "Search audio or artist": "آڈیو یا فنکار تلاش کریں", "Search books or authors": "کتابیں یا مصنفین تلاش کریں", "New devotional works and thoughtful collections, shared with care.": "نیا عقیدتی کلام اور بامعنی مجموعے، محبت کے ساتھ۔",
  "Your email address": "آپ کا ای میل پتہ", "Enter your name": "اپنا نام درج کریں", "Enter your email": "اپنا ای میل درج کریں", "Enter your subject": "اپنا موضوع درج کریں", "Enter your full name": "اپنا پورا نام درج کریں", "Enter your email or username": "اپنا ای میل یا صارف نام درج کریں", "Enter your confirm password": "پاس ورڈ کی تصدیق درج کریں",
  Management: "انتظام", "Good morning, Editor": "صبح بخیر، مدیر",
  "Audio Items": "آڈیو مواد", "Pending Content": "زیرِ التوا مواد", Edit: "ترمیم", Preview: "پیش منظر", "Publish Date": "تاریخِ اشاعت", Title: "عنوان", Slug: "سلگ", "Writer / Poet": "مصنف / شاعر", "Artist / Naatkhawan": "فنکار / نعت خواں", "Enter verified lyrics content...": "مصدقہ کلام درج کریں...", "All Audio": "تمام آڈیو", "All Books": "تمام کتابیں", "All Work": "تمام کام",
});

Object.assign(messages.hi, {
  "Audio Items": "ऑडियो सामग्री", "Pending Content": "लंबित सामग्री", Edit: "संपादित करें", Preview: "पूर्वावलोकन", "Publish Date": "प्रकाशन तिथि", Title: "शीर्षक", Slug: "स्लग", "Writer / Poet": "लेखक / कवि", "Artist / Naatkhawan": "कलाकार / नातख़्वाँ", "Enter verified lyrics content...": "प्रमाणित लिरिक्स दर्ज करें...", "All Audio": "सभी ऑडियो", "All Books": "सभी पुस्तकें", "All Work": "सभी कार्य",
  "Search the Quran home collection": "क़ुरआन संग्रह में खोजें", "Find a Surah by name or number": "नाम या संख्या से सूरत खोजें", "Find a Para by number or name": "संख्या या नाम से पारा खोजें", "Filter Makki or Madani Surahs": "मक्की या मदनी सूरतें फ़िल्टर करें", "Search Quran topics": "क़ुरआनी विषय खोजें", "Search Quranic quotes": "क़ुरआनी उद्धरण खोजें", "Search Quran recitations": "क़ुरआन पाठ खोजें", "Search Quran": "क़ुरआन खोजें",
  "Share dialog opened.": "साझाकरण संवाद खुला।", "Share link copied to your clipboard.": "साझा करने का लिंक क्लिपबोर्ड पर कॉपी किया गया।", "Share was unavailable, so the page link was copied instead.": "साझाकरण उपलब्ध नहीं था, इसलिए पृष्ठ का लिंक कॉपी किया गया।", "Sharing is unavailable in this browser.": "इस ब्राउज़र में साझा करना उपलब्ध नहीं है।",
  "Bookmark updated in this browser. Account sync is unavailable in this prototype.": "इस ब्राउज़र में बुकमार्क अपडेट हुआ। इस प्रोटोटाइप में खाते के साथ सिंक उपलब्ध नहीं है।",
});

Object.assign(messages.ur, {
  "Audio Items": "آڈیو مواد", "Pending Content": "زیرِ التوا مواد", Edit: "ترمیم کریں", Preview: "پیش منظر", "Publish Date": "تاریخِ اشاعت", Title: "عنوان", Slug: "سلگ", "Writer / Poet": "مصنف / شاعر", "Artist / Naatkhawan": "فنکار / نعت خواں", "Enter verified lyrics content...": "مصدقہ کلام درج کریں...", "All Audio": "تمام آڈیو", "All Books": "تمام کتابیں", "All Work": "تمام کام",
  "Search the Quran home collection": "قرآن کے مجموعے میں تلاش کریں", "Find a Surah by name or number": "نام یا نمبر سے سورت تلاش کریں", "Find a Para by number or name": "نمبر یا نام سے پارہ تلاش کریں", "Filter Makki or Madani Surahs": "مکی یا مدنی سورتیں فلٹر کریں", "Search Quran topics": "قرآنی موضوعات تلاش کریں", "Search Quranic quotes": "قرآنی اقتباسات تلاش کریں", "Search Quran recitations": "قرآن کی تلاوت تلاش کریں", "Search Quran": "قرآن تلاش کریں",
  "Share dialog opened.": "شیئرنگ کا مکالمہ کھل گیا۔", "Share link copied to your clipboard.": "شیئر لنک کلپ بورڈ پر نقل ہو گیا۔", "Share was unavailable, so the page link was copied instead.": "شیئرنگ دستیاب نہیں تھی، اس لیے صفحے کا لنک نقل کیا گیا۔", "Sharing is unavailable in this browser.": "اس براؤزر میں شیئرنگ دستیاب نہیں۔",
  "Bookmark updated in this browser. Account sync is unavailable in this prototype.": "اس براؤزر میں بک مارک اپ ڈیٹ ہوا۔ اس نمونے میں اکاؤنٹ کے ساتھ ہم وقت سازی دستیاب نہیں۔",
  "Discover words of praise and devotion across languages, traditions, and beloved voices.": "زبانوں، روایات اور پسندیدہ آوازوں میں حمد و عقیدت کا کلام دریافت کریں۔", "What We Do": "ہم کیا کرتے ہیں", "Selected Work": "منتخب کام",
});

Object.assign(messages.hi, {
  "Discover words of praise and devotion across languages, traditions, and beloved voices.": "विभिन्न भाषाओं, परंपराओं और प्रिय आवाज़ों में प्रशंसा और भक्ति के शब्द खोजें।", "What We Do": "हम क्या करते हैं", "Selected Work": "चुनिंदा काम",
});

Object.assign(messages.hi, {
  "Zikr-e-Ilahi home": "ज़िक्र-ए-इलाही होम", "Main navigation": "मुख्य नेविगेशन", "Toggle menu": "मेनू खोलें या बंद करें",
  "Lyrics browse destinations": "लिरिक्स ब्राउज़ विकल्प", "Persistent audio player": "स्थायी ऑडियो प्लेयर", "Previous track": "पिछला ट्रैक", "Next track": "अगला ट्रैक", "Close player": "प्लेयर बंद करें",
  "Lyrics browsing navigation": "लिरिक्स ब्राउज़ नेविगेशन", "Filter by first letter": "पहले अक्षर से फ़िल्टर करें", "Related Lyrics": "संबंधित लिरिक्स", "Surah Directory": "सूरत सूची", "Open Surah navigation": "सूरत नेविगेशन खोलें",
  "Reader mode": "पठन मोड", "Surah navigation": "सूरत नेविगेशन", "Dismiss message": "संदेश हटाएँ", "Quran navigation": "क़ुरआन नेविगेशन", "Close navigation": "नेविगेशन बंद करें", "Navigate by": "इसके अनुसार जाएँ",
  "Search Surah": "सूरत खोजें", "Select Surah": "सूरत चुनें", "Close translations": "अनुवाद बंद करें", "Search translations": "अनुवाद खोजें", "Quran audio player": "क़ुरआन ऑडियो प्लेयर",
  "Previous Ayah": "पिछली आयत", "Next Ayah": "अगली आयत", "Recitation progress": "तिलावत की प्रगति", "Para Directory": "पारा सूची", "Our Portfolio": "हमारा पोर्टफ़ोलियो", "Related Books": "संबंधित पुस्तकें",
  "Mosque architecture project artwork": "मस्जिद वास्तुकला परियोजना का चित्र", "Visitors walking beside a beautiful white mosque": "सुंदर सफ़ेद मस्जिद के पास चलते आगंतुक",
});

Object.assign(messages.ur, {
  "Zikr-e-Ilahi home": "ذکرِ الٰہی صفحۂ اول", "Main navigation": "مرکزی نیویگیشن", "Toggle menu": "مینو کھولیں یا بند کریں",
  "Lyrics browse destinations": "کلام براؤز کے راستے", "Persistent audio player": "مستقل آڈیو پلیئر", "Previous track": "پچھلا ٹریک", "Next track": "اگلا ٹریک", "Close player": "پلیئر بند کریں",
  "Lyrics browsing navigation": "کلام براؤز نیویگیشن", "Filter by first letter": "پہلے حرف کے مطابق فلٹر کریں", "Related Lyrics": "متعلقہ کلام", "Surah Directory": "سورتوں کی فہرست", "Open Surah navigation": "سورت نیویگیشن کھولیں",
  "Reader mode": "مطالعے کا انداز", "Surah navigation": "سورت نیویگیشن", "Dismiss message": "پیغام ہٹائیں", "Quran navigation": "قرآن نیویگیشن", "Close navigation": "نیویگیشن بند کریں", "Navigate by": "اس کے مطابق جائیں",
  "Search Surah": "سورت تلاش کریں", "Select Surah": "سورت منتخب کریں", "Close translations": "تراجم بند کریں", "Search translations": "تراجم تلاش کریں", "Quran audio player": "قرآن آڈیو پلیئر",
  "Previous Ayah": "پچھلی آیت", "Next Ayah": "اگلی آیت", "Recitation progress": "تلاوت کی پیش رفت", "Para Directory": "پاروں کی فہرست", "Our Portfolio": "ہمارا پورٹ فولیو", "Related Books": "متعلقہ کتابیں",
  "Mosque architecture project artwork": "مسجد کے طرزِ تعمیر کے منصوبے کی تصویر", "Visitors walking beside a beautiful white mosque": "خوبصورت سفید مسجد کے پاس چلتے زائرین",
});

Object.assign(messages.hi, {
  "Naat Sharif": "नात शरीफ़", Hamd: "हम्द", "Durood-o-Salam": "दरूद-ओ-सलाम", "Sufi Kalam": "सूफ़ी कलाम", Manqabat: "मनक़बत", Qawwali: "क़व्वाली", "Quran Recitation": "क़ुरआन पाठ", Bayan: "बयान",
  "All Work": "सभी कार्य", Video: "वीडियो", Design: "डिज़ाइन", "AUDIO PRODUCTION": "ऑडियो निर्माण", "VIDEO EDIT": "वीडियो संपादन", "COVER DESIGN": "कवर डिज़ाइन",
  "All Books": "सभी पुस्तकें", "Islamic Books": "इस्लामी पुस्तकें", "Naat Books": "नात पुस्तकें", "Ala Hazrat Books": "आला हज़रत पुस्तकें", "Dua Books": "दुआ पुस्तकें", "E-Book": "ई-पुस्तक", Service: "सेवा",
  Dashboard: "डैशबोर्ड", "Quran Content": "क़ुरआन सामग्री", "Authors / Artists": "लेखक / कलाकार", "Contact Enquiries": "संपर्क पूछताछ", Settings: "सेटिंग्स", "Quran Content Management": "क़ुरआन सामग्री प्रबंधन", "Audio Management": "ऑडियो प्रबंधन", "E-Books Management": "ई-पुस्तक प्रबंधन", "Services Management": "सेवा प्रबंधन", "Portfolio Management": "पोर्टफ़ोलियो प्रबंधन", "Categories Management": "श्रेणी प्रबंधन", "Authors / Artists Management": "लेखक / कलाकार प्रबंधन", "Contact Enquiries Management": "संपर्क पूछताछ प्रबंधन", "Settings Management": "सेटिंग्स प्रबंधन",
});

Object.assign(messages.ur, {
  "Naat Sharif": "نعت شریف", Hamd: "حمد", "Durood-o-Salam": "درود و سلام", "Sufi Kalam": "صوفی کلام", Manqabat: "منقبت", Qawwali: "قوالی", "Quran Recitation": "قرآن کی تلاوت", Bayan: "بیان",
  "All Work": "تمام کام", Video: "ویڈیو", Design: "ڈیزائن", "AUDIO PRODUCTION": "آڈیو پروڈکشن", "VIDEO EDIT": "ویڈیو ایڈیٹنگ", "COVER DESIGN": "سرورق کا ڈیزائن",
  "All Books": "تمام کتابیں", "Islamic Books": "اسلامی کتابیں", "Naat Books": "نعت کی کتابیں", "Ala Hazrat Books": "اعلیٰ حضرت کی کتابیں", "Dua Books": "دعاؤں کی کتابیں", "E-Book": "ای کتاب", Service: "خدمت",
  Dashboard: "ڈیش بورڈ", "Quran Content": "قرآنی مواد", "Authors / Artists": "مصنفین / فنکار", "Contact Enquiries": "رابطے کی درخواستیں", Settings: "ترتیبات", "Quran Content Management": "قرآنی مواد کا انتظام", "Audio Management": "آڈیو کا انتظام", "E-Books Management": "ای کتابوں کا انتظام", "Services Management": "خدمات کا انتظام", "Portfolio Management": "پورٹ فولیو کا انتظام", "Categories Management": "اقسام کا انتظام", "Authors / Artists Management": "مصنفین / فنکاروں کا انتظام", "Contact Enquiries Management": "رابطے کی درخواستوں کا انتظام", "Settings Management": "ترتیبات کا انتظام",
});

Object.assign(messages.hi, {
  "This sample audio source could not play in your browser.": "यह नमूना ऑडियो स्रोत आपके ब्राउज़र में नहीं चल सका।", "The selected audio source is unavailable or blocked.": "चुना गया ऑडियो स्रोत उपलब्ध नहीं है या अवरुद्ध है।",
  "Bookmarks are available for this session, but local storage is unavailable.": "बुकमार्क इस सत्र में उपलब्ध हैं, लेकिन स्थानीय संग्रहण उपलब्ध नहीं है।", "Bookmarks could not be loaded from this browser.": "इस ब्राउज़र से बुकमार्क लोड नहीं हो सके।",
  "That Surah is not available in the local catalog.": "वह सूरत स्थानीय सूची में उपलब्ध नहीं है।", "This Ayah has no text in the local mock dataset to copy.": "स्थानीय नमूना डेटा में इस आयत का कॉपी करने योग्य पाठ नहीं है।", "Clipboard access is unavailable in this browser.": "इस ब्राउज़र में क्लिपबोर्ड उपलब्ध नहीं है।",
  "This Ayah has no text in the local mock dataset to share.": "स्थानीय नमूना डेटा में इस आयत का साझा करने योग्य पाठ नहीं है।", "Ayah copied for sharing.": "साझा करने के लिए आयत कॉपी की गई।", "Sharing was cancelled or is unavailable.": "साझाकरण रद्द किया गया या उपलब्ध नहीं है।",
  "Surah recitation audio is not available locally.": "सूरत की तिलावत का ऑडियो स्थानीय रूप से उपलब्ध नहीं है।", "The audio player is unavailable in this browser.": "इस ब्राउज़र में ऑडियो प्लेयर उपलब्ध नहीं है।", "The configured recitation could not be played.": "निर्धारित तिलावत नहीं चलाई जा सकी।", "The configured recitation could not be loaded.": "निर्धारित तिलावत लोड नहीं हो सकी।",
  "This action could not be saved for return after sign-in. Please retry from the content page.": "साइन-इन के बाद जारी रखने के लिए यह कार्रवाई सहेजी नहीं जा सकी। सामग्री पृष्ठ से फिर प्रयास करें।", "This audio download is no longer available.": "यह ऑडियो डाउनलोड अब उपलब्ध नहीं है।",
  "This PDF is no longer available or authorized for download.": "यह PDF अब उपलब्ध नहीं है या डाउनलोड के लिए अधिकृत नहीं है।", "This Quran bookmark reference is unavailable.": "यह क़ुरआन बुकमार्क संदर्भ उपलब्ध नहीं है।", "Bookmarks could not be saved in this browser.": "इस ब्राउज़र में बुकमार्क सहेजे नहीं जा सके।",
  "Account saving is unavailable because this project has no saved-items service.": "इस परियोजना में सहेजी गई सामग्री की सेवा नहीं है, इसलिए खाता-सहेजना उपलब्ध नहीं है।", "This audio file is not available for download.": "यह ऑडियो फ़ाइल डाउनलोड के लिए उपलब्ध नहीं है।", "The browser blocked the download window. Allow pop-ups and retry.": "ब्राउज़र ने डाउनलोड विंडो रोक दी। पॉप-अप की अनुमति देकर फिर प्रयास करें।",
  "This PDF is unavailable or not authorized for download.": "यह PDF उपलब्ध नहीं है या डाउनलोड के लिए अधिकृत नहीं है।", "Pause audio": "ऑडियो रोकें", "Play audio": "ऑडियो चलाएँ", "Audio unavailable · no playable source configured": "ऑडियो उपलब्ध नहीं · चलाने योग्य स्रोत सेट नहीं है",
});

Object.assign(messages.ur, {
  "This sample audio source could not play in your browser.": "یہ نمونہ آڈیو آپ کے براؤزر میں نہیں چل سکا۔", "The selected audio source is unavailable or blocked.": "منتخب آڈیو دستیاب نہیں یا مسدود ہے۔",
  "Bookmarks are available for this session, but local storage is unavailable.": "بک مارکس اس سیشن میں دستیاب ہیں، مگر مقامی ذخیرہ دستیاب نہیں۔", "Bookmarks could not be loaded from this browser.": "اس براؤزر سے بک مارکس لوڈ نہیں ہو سکے۔",
  "That Surah is not available in the local catalog.": "وہ سورت مقامی فہرست میں دستیاب نہیں۔", "This Ayah has no text in the local mock dataset to copy.": "مقامی نمونے میں اس آیت کا نقل کرنے والا متن موجود نہیں۔", "Clipboard access is unavailable in this browser.": "اس براؤزر میں کلپ بورڈ دستیاب نہیں۔",
  "This Ayah has no text in the local mock dataset to share.": "مقامی نمونے میں اس آیت کا شیئر کرنے والا متن موجود نہیں۔", "Ayah copied for sharing.": "شیئر کرنے کے لیے آیت نقل کر دی گئی۔", "Sharing was cancelled or is unavailable.": "شیئرنگ منسوخ ہوئی یا دستیاب نہیں۔",
  "Surah recitation audio is not available locally.": "سورت کی تلاوت کا آڈیو مقامی طور پر دستیاب نہیں۔", "The audio player is unavailable in this browser.": "اس براؤزر میں آڈیو پلیئر دستیاب نہیں۔", "The configured recitation could not be played.": "مقررہ تلاوت نہیں چلائی جا سکی۔", "The configured recitation could not be loaded.": "مقررہ تلاوت لوڈ نہیں ہو سکی۔",
  "This action could not be saved for return after sign-in. Please retry from the content page.": "سائن اِن کے بعد جاری رکھنے کے لیے یہ کارروائی محفوظ نہیں ہو سکی۔ مواد کے صفحے سے دوبارہ کوشش کریں۔", "This audio download is no longer available.": "یہ آڈیو ڈاؤن لوڈ اب دستیاب نہیں۔",
  "This PDF is no longer available or authorized for download.": "یہ PDF اب دستیاب نہیں یا ڈاؤن لوڈ کے لیے مجاز نہیں۔", "This Quran bookmark reference is unavailable.": "قرآن کا یہ بک مارک حوالہ دستیاب نہیں۔", "Bookmarks could not be saved in this browser.": "اس براؤزر میں بک مارکس محفوظ نہیں ہو سکے۔",
  "Account saving is unavailable because this project has no saved-items service.": "اس منصوبے میں محفوظ مواد کی سہولت نہیں، اس لیے اکاؤنٹ میں محفوظ کرنا دستیاب نہیں۔", "This audio file is not available for download.": "یہ آڈیو فائل ڈاؤن لوڈ کے لیے دستیاب نہیں۔", "The browser blocked the download window. Allow pop-ups and retry.": "براؤزر نے ڈاؤن لوڈ ونڈو روک دی۔ پاپ اپ کی اجازت دے کر دوبارہ کوشش کریں۔",
  "This PDF is unavailable or not authorized for download.": "یہ PDF دستیاب نہیں یا ڈاؤن لوڈ کے لیے مجاز نہیں۔", "Pause audio": "آڈیو روکیں", "Play audio": "آڈیو چلائیں", "Audio unavailable · no playable source configured": "آڈیو دستیاب نہیں · چلانے کے لیے ماخذ مقرر نہیں",
});

Object.assign(messages.hi, {
  "Naats, Hamd, Manqabat & Sufi Kalam": "नात, हम्द, मनक़बत और सूफ़ी कलाम", Devotional: "भक्ति", "Recited By": "पाठ किया", "Written By": "रचना", Published: "प्रकाशित", Book: "पुस्तक", Subject: "विषय",
  "Published Lyrics": "प्रकाशित लिरिक्स", Review: "समीक्षा",
  "Enter your publish date": "प्रकाशन तिथि दर्ज करें", "Enter your title": "शीर्षक दर्ज करें", "Enter your slug": "स्लग दर्ज करें", "Enter your writer / poet": "लेखक / कवि का नाम दर्ज करें", "Enter your artist / naatkhawan": "कलाकार / नातख़्वाँ का नाम दर्ज करें", "Enter your category": "श्रेणी दर्ज करें", "Enter your language": "भाषा दर्ज करें",
});

Object.assign(messages.ur, {
  "Naats, Hamd, Manqabat & Sufi Kalam": "نعت، حمد، منقبت اور صوفی کلام", Devotional: "عقیدت", "Recited By": "پڑھنے والے", "Written By": "تحریر", Published: "شائع شدہ", Book: "کتاب", Subject: "موضوع",
  "Published Lyrics": "شائع شدہ کلام", Review: "جائزہ",
  "Enter your publish date": "تاریخِ اشاعت درج کریں", "Enter your title": "عنوان درج کریں", "Enter your slug": "سلگ درج کریں", "Enter your writer / poet": "مصنف / شاعر کا نام درج کریں", "Enter your artist / naatkhawan": "فنکار / نعت خواں کا نام درج کریں", "Enter your category": "قسم درج کریں", "Enter your language": "زبان درج کریں",
});

Object.assign(messages.hi, { Back: "वापस", "All languages": "सभी भाषाएँ" });
Object.assign(messages.ur, { Back: "واپس", "All languages": "تمام زبانیں" });

export function translateInterface(language: string, key: string): string {
  const translated = messages[language as InterfaceLanguage]?.[key];
  if (translated) return translated;
  if (language === "hi") {
    const searchLyrics = key.match(/^Search (.+) lyrics$/);
    if (searchLyrics) return `${searchLyrics[1]} लिरिक्स खोजें`;
    const searchGroup = key.match(/^Search (.+) and lyrics$/);
    if (searchGroup) return `${searchGroup[1]} और लिरिक्स खोजें`;
    const selectedLyrics = key.match(/^(.+) lyrics$/);
    if (selectedLyrics) return `${selectedLyrics[1]} लिरिक्स`;
    const noSelectedLyrics = key.match(/^No lyrics match this (.+) selection\.$/);
    if (noSelectedLyrics) return `इस ${noSelectedLyrics[1]} चयन से कोई लिरिक्स मेल नहीं खातीं।`;
    const noGroup = key.match(/^No (.+) match those filters\.$/);
    if (noGroup) return `इन फ़िल्टर से कोई ${noGroup[1]} मेल नहीं खाते।`;
  }
  if (language === "ur") {
    const searchLyrics = key.match(/^Search (.+) lyrics$/);
    if (searchLyrics) return `${searchLyrics[1]} کا کلام تلاش کریں`;
    const searchGroup = key.match(/^Search (.+) and lyrics$/);
    if (searchGroup) return `${searchGroup[1]} اور کلام تلاش کریں`;
    const selectedLyrics = key.match(/^(.+) lyrics$/);
    if (selectedLyrics) return `${selectedLyrics[1]} کا کلام`;
    const noSelectedLyrics = key.match(/^No lyrics match this (.+) selection\.$/);
    if (noSelectedLyrics) return `اس ${noSelectedLyrics[1]} کے انتخاب سے کوئی کلام مطابقت نہیں رکھتا۔`;
    const noGroup = key.match(/^No (.+) match those filters\.$/);
    if (noGroup) return `ان فلٹرز سے کوئی ${noGroup[1]} مطابقت نہیں رکھتا۔`;
  }
  if (language === "hi") {
    const ayat = key.match(/^(\d+) Ayat$/);
    if (ayat) return `${ayat[1]} आयतें`;
    const makkiMadani = key === "Makki" ? "मक्की" : key === "Madani" ? "मदनी" : null;
    if (makkiMadani) return makkiMadani;
    const count = key.match(/^(\d+) (tracks|books|titles|works|Surahs) • newest first$/);
    if (count) return `${count[1]} ${({ tracks: "ट्रैक", books: "पुस्तकें", titles: "शीर्षक", works: "रचनाएँ", Surahs: "सूरतें" } as const)[count[2] as "tracks" | "books" | "titles" | "works" | "Surahs"]} • नवीनतम पहले`;
    const simpleCount = key.match(/^(\d+) (titles|works|categories|reciters|poets|books|languages)$/);
    if (simpleCount) return `${simpleCount[1]} ${({ titles: "शीर्षक", works: "रचनाएँ", categories: "श्रेणियाँ", reciters: "पाठक", poets: "शायर", books: "पुस्तकें", languages: "भाषाएँ" } as const)[simpleCount[2] as "titles" | "works" | "categories" | "reciters" | "poets" | "books" | "languages"]}`;
  }
  if (language === "ur") {
    const ayat = key.match(/^(\d+) Ayat$/);
    if (ayat) return `${ayat[1]} آیات`;
    const makkiMadani = key === "Makki" ? "مکی" : key === "Madani" ? "مدنی" : null;
    if (makkiMadani) return makkiMadani;
    const count = key.match(/^(\d+) (tracks|books|titles|works|Surahs) • newest first$/);
    if (count) return `${count[1]} ${({ tracks: "ٹریک", books: "کتابیں", titles: "عنوانات", works: "کلام", Surahs: "سورتیں" } as const)[count[2] as "tracks" | "books" | "titles" | "works" | "Surahs"]} • تازہ ترین پہلے`;
    const simpleCount = key.match(/^(\d+) (titles|works|categories|reciters|poets|books|languages)$/);
    if (simpleCount) return `${simpleCount[1]} ${({ titles: "عنوانات", works: "کلام", categories: "اقسام", reciters: "نعت خواں", poets: "شعرا", books: "کتابیں", languages: "زبانیں" } as const)[simpleCount[2] as "titles" | "works" | "categories" | "reciters" | "poets" | "books" | "languages"]}`;
  }
  return messages.en[key] || key;
}

export function readPreference(key: string, fallback: string): string {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}