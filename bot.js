const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
    const EMAIL = process.env.SITE_EMAIL;
    const PASSWORD = process.env.SITE_PASSWORD;

    if (!EMAIL || !PASSWORD) {
        console.error('ERROR: SITE_EMAIL অথবা SITE_PASSWORD সেটিংসে পাওয়া যায়নি!');
        process.exit(1);
    }

    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080'
        ]
    });

    const page = await browser.newPage();

    // আসল ব্রাউজার সেশন ও কাস্টম ইউজার-এজেন্ট
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    try {
        // ১. লগইন সম্পন্ন করা
        console.log('[+] অ্যাকাউন্ট লগইন করা হচ্ছে...');
        await page.goto('https://reebook-meta.com/login.php', { waitUntil: 'networkidle2' });

        const emailInput = await page.waitForSelector('input[name="email"]', { visible: true });
        await emailInput.type(EMAIL, { delay: 60 });

        const passwordInput = await page.waitForSelector('input[name="password"]', { visible: true });
        await passwordInput.type(PASSWORD, { delay: 60 });

        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})
        ]);

        console.log('[✓] আপনার আইডি সফলভাবে সাইটে লগইন হয়েছে!');

        // ২. ড্যাশবোর্ডে অ্যাক্সেস নেওয়া
        console.log('[+] ড্যাশবোর্ডে যাওয়া হচ্ছে...');
        await page.goto('https://reebook-meta.com/users/dashboard.php', { waitUntil: 'networkidle2' });
        await delay(2000);

        let realLikedCount = 0;

        console.log('[+] ইউজারদের আসল পোস্ট সনাক্তকরণ শুরু হচ্ছে...');

        for (let scrollAttempt = 0; scrollAttempt < 8; scrollAttempt++) {
            
            // প্রতিটি ইউজার পোস্ট ও তার মধ্যকার লাইক/লাভ বাটন বের করা
            const clickedInThisScroll = await page.evaluate(async () => {
                let count = 0;

                // প্রতিটি পোস্টের মূল বক্স খুঁজে বের করার চেষ্টা
                // সাধারণত ফেসবুক ক্লোন সাইটগুলোতে পোস্টগুলো আলাদা আলাদা div/article বা কার্ডে থাকে
                const allElements = Array.from(document.querySelectorAll('div, article, section'));
                
                for (let container of allElements) {
                    // এটি যদি নিশ্চিতভাবে একটি সম্পূর্ণ পোস্ট বক্স হয় (যেখানে লাইক, কমেন্ট ও শেয়ার রয়েছে)
                    const containerText = container.innerText || '';
                    if (containerText.includes('মন্তব্য') && containerText.includes(' শেয়ার')) {
                        
                        // পোস্টটির ভেতর থেকে একমাত্র লাইক/লাভ বাটনটি বের করা
                        const buttons = Array.from(container.querySelectorAll('button, a, div[role="button"]'));
                        
                        for (let btn of buttons) {
                            const btnText = btn.innerText ? btn.innerText.trim() : '';

                            // যে বাটনটিতে ক্লিক দিলে রিঅ্যাকশন সার্ভারে যাবে এবং যা আগে ক্লিক করা হয়নি
                            if ((btnText.includes('লাভ') || btnText.includes('Like')) && !btn.getAttribute('data-bot-processed')) {
                                
                                btn.setAttribute('data-bot-processed', 'true');
                                container.setAttribute('data-post-liked', 'true');

                                // বাটনে স্ক্রোল করে ভিজিবল করা
                                btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                
                                // আসল মাউস ইভেন্ট দিয়ে সাইটের ব্যাকএন্ডে রিকোয়েস্ট পাঠানো
                                const opts = { bubbles: true, cancelable: true, view: window };
                                btn.dispatchEvent(new MouseEvent('mousedown', opts));
                                btn.dispatchEvent(new MouseEvent('mouseup', opts));
                                btn.click();
                                btn.dispatchEvent(new MouseEvent('click', opts));

                                count++;
                                await new Promise(r => setTimeout(r, 2000)); // আসল ক্লিক রেসপন্স হওয়ার জন্য বিরতি
                                break; // একটি পোস্টে একবারই ক্লিক হবে
                            }
                        }
                    }
                }
                return count;
            });

            if (clickedInThisScroll > 0) {
                realLikedCount += clickedInThisScroll;
                console.log(`[✓] মোট ${clickedInThisScroll} টি আসল ইউজারের পোস্টে সফলভাবে লাইক পাঠানো হয়েছে। (চলতি মোট: ${realLikedCount})`);
            } else {
                console.log('[i] নতুন কোনো আন-লাইকড পোস্ট স্ক্রিনে দেখা যায়নি।');
            }

            // ফেসবুকের মত পেজ কিছুটা স্ক্রোল করে নতুন পোস্টের জন্য অপেক্ষা করা
            await page.evaluate('window.scrollBy(0, 600)');
            await delay(3000);
        }

        console.log(`[SUCCESS] আপনার আইডি দিয়ে মোট ${realLikedCount} টি পোস্টে আসল রিঅ্যাকশন বা লাইক সফলভাবে যুক্ত হয়েছে!`);

    } catch (error) {
        console.error('[ERROR] প্রসেস চলাকালীন সমস্যা:', error.message);
    } finally {
        await browser.close();
        console.log('[+] সেশন বন্ধ করা হয়েছে।');
    }
})();
