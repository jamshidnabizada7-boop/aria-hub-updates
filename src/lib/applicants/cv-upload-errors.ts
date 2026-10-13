type Locale='en'|'fa'|'ps';
const messages={
 invalid_file_size:['Choose a non-empty file smaller than 8 MB.','فایل غیرخالی با حجم کمتر از ۸ مگابایت انتخاب کنید.','یو غیرتش فایل له ۸ MB څخه کوچنی غوره کړئ.'],
 invalid_file_format:['This file is not a valid PDF, DOCX or supported image. Export a fresh copy and try again.','فایل معتبر PDF، DOCX یا عکس پشتیبانی‌شده انتخاب کنید.','یو معتبر PDF، DOCX یا ملاتړ شوی انځور غوره کړئ.'],
 scanner_unavailable_or_file_rejected:['The security scan could not accept this file. Try a fresh PDF; contact support if it continues.','بررسی امنیتی فایل ناکام شد. نسخه تازه PDF را امتحان کنید.','امنیتي کتنې فایل ونه مانه. تازه PDF وازمویئ.'],
 cv_storage_capacity_unavailable:['Private storage is temporarily full. Your file was not saved. Please try again later or contact ARIA HUB.','ذخیره‌سازی خصوصی موقتاً ظرفیت ندارد. فایل ذخیره نشد؛ بعداً تلاش کنید یا با آریا هاب تماس بگیرید.','شخصي ذخیره موقتي ډکه ده. فایل خوندي نه شو؛ وروسته هڅه وکړئ یا له آریا هاب سره اړیکه ونیسئ.'],
 rate_limited:['Daily upload limit reached. Please try again tomorrow.','حد روزانه آپلود تکمیل شده است. فردا تلاش کنید.','د ورځني پورته کولو حد پوره شو. سبا هڅه وکړئ.'],
 document_limit_reached:['Your library has 10 CVs. Remove an old file before uploading another.','کتابخانه شما ۱۰ سی‌وی دارد. پیش از آپلود فایل دیگر، یک فایل قدیمی را حذف کنید.','ستاسو کتابتون ۱۰ سي وي لري. د بل فایل مخکې یو زوړ فایل لرې کړئ.'],
 already_uploaded:['This CV is already in your library.','این سی‌وی در کتابخانه شما موجود است.','دا سي وي ستاسو په کتابتون کې شته.'],
 unauthorized:['Sign in again, then retry your upload.','دوباره وارد حساب شوید و آپلود را تکرار کنید.','بیا حساب ته ننوځئ او فایل پورته کړئ.'],
 default:['Upload could not be completed. Your file was not saved. Please retry or contact ARIA HUB.','آپلود تکمیل نشد. فایل ذخیره نشده است؛ دوباره تلاش کنید یا با آریا هاب تماس بگیرید.','فایل پورته نه شو او خوندي نه شو. بیا هڅه وکړئ یا له آریا هاب سره اړیکه ونیسئ.']
} as const;
export function cvUploadError(code:unknown,lang:Locale){
 const key=typeof code==='string'?code:'';
 const normalized=['upload_too_large','payload_too_large'].includes(key)?'invalid_file_size':key==='image_dimensions_out_of_bounds'?'invalid_file_format':key;
 return (messages[normalized as keyof typeof messages]||messages.default)[{en:0,fa:1,ps:2}[lang]];
}
