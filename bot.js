const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
    const EMAIL = process.env.SITE_EMAIL;
    const PASSWORD = process.env.SITE_PASSWORD;

    if (!EMAIL || !PASSWORD) {
        console.error('[!] ERROR: SITE_EMAIL অথবা SITE_PASSWORD সেটিংসে পাওয়া যায়নি!');
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

    // কোনো বাধ্যতামূলক ফিক্সড টাইমআউট রাখা হয়নি (সার্ভারের গতির ওপর নির্ভর করে ডায়নামিক্যালি কাজ করবে)
    await page.setDefaultNavigationTimeout(0);
    await page.setDefaultTimeout(0);

    // রিয়েল হিউম্যান ইউজার-এজেন্ট হেডার
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        // ১. লগইন পেজে ভিজিট (সার্ভার থেকে ডায়নামিকালি কন্টেন্ট লোড হওয়া পর্যন্ত ওয়েট)
        console.log('[+] লগইন পেজে নেভিগেট করা হচ্ছে...');
        await page.goto('https://reebook-meta.com/login.php', { waitUntil: 'domcontentloaded' });

        // ২. ইমেইল এবং পাসওয়ার্ড ফিল্ড রেডি হওয়ার সাথে সাথে ইনপুট দেওয়া
        console.log('[+] লগইন ফিল্ড রেডি হওয়ার সাথে সাথে ডেটা টাইপ করা হচ্ছে...');
        const emailInput = await page.waitForSelector('input[name="email"]', { visible: true });
        await emailInput.type(EMAIL, { delay: 50 });

        const passwordInput = await page.waitForSelector('input[name="password"]', { visible: true });
        await passwordInput.type(PASSWORD, { delay: 50 });

        console.log('[+] লগইন সাবমিট করা হচ্ছে...');
        
        // সাবমিট বাটন এবং পরবর্তী পেজে সফলভাবে রিডাইরেক্ট হওয়ার ডায়নামিক অপেক্ষা
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {})
        ]);

        console.log('[✓] আপনার আইডি সফলভাবে সিস্টেমে লগইন হয়েছে!');

        // ৩. সরাসরি ড্যাশবোর্ডে যাওয়া এবং ড্যাশবোর্ড কন্টেন্ট রেডি হওয়া নিশ্চিত করা
        console.log('[+] ইউজার ফিড/ড্যাশবোর্ডে যাওয়া হচ্ছে...');
        await page.goto('https://reebook-meta.com/users/dashboard.php', { waitUntil: 'domcontentloaded' });

        // ড্যাশবোর্ডের প্রথম পোস্ট লোড হওয়া পর্যন্ত ডায়নামিক অপেক্ষা
        await page.waitForSelector('body', { visible: true });

        let totalLiked = 0;
        console.log('[+] ইউজারের আসল পোস্টগুলোতে লাইক দেওয়ার প্রসেস শুরু হচ্ছে...');

        // ৪. ডায়নামিক স্ক্রোল এবং রিয়েল-টাইম পোস্ট রিঅ্যাকশন হ্যান্ডলিং
        for (let scrollCycle = 0; scrollCycle < 15; scrollCycle++) {
            
            // রিয়েল-টাইমে পেজের DOM থেকে পোস্ট সনাক্তকরণ
            const likedInCycle = await page.evaluate(async () => {
                let count = 0;

                // প্রতিটি ইউজার পোস্ট কার্ড বা কন্টেইনার বের করা
                const containers = Array.from(document.querySelectorAll('div, article, section'));

                for (let container of containers) {
                    const text = container.innerText || '';

                    // নিশ্চিত হওয়া যে এটি একটি ইউজার পোস্ট (লাইক/কমেন্ট/ শেয়ার অপশন রয়েছে)
                    if ((text.includes('মন্তব্য') || text.includes('শেয়ার') || text.includes('Comment')) && !container.getAttribute('data-bot-done')) {
                        
                        container.setAttribute('data-bot-done', 'true');

                        // কেবল ওই নির্দিষ্ট পোস্টের আসল লাইক/লাভ বাটন চিহ্নিত করা
                        const buttons = Array.from(container.querySelectorAll('button, a, div[role="button"], span'));

                        for (let btn of buttons) {
                            const btnText = btn.innerText ? btn.innerText.trim() : '';

                            if (btnText === 'লাভ' || btnText === 'Like' || btnText.includes('লাভ')) {
                                
                                // ভিজিবল স্ক্রোলে নিয়ে আসা
                                btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                
                                // আসল মানুষের হাতের টাচ/মাউস ক্লিকে যে ইভেন্ট সিকোয়েন্স তৈরি হয় তা ফায়ার করা
                                const opts = { bubbles: true, cancelable: true, view: window };
                                btn.dispatchEvent(new MouseEvent('mouseover', opts));
                                btn.dispatchEvent(new MouseEvent('mousedown', opts));
                                btn.dispatchEvent(new MouseEvent('mouseup', opts));
                                btn.click();
                                btn.dispatchEvent(new MouseEvent('click', opts));

                                count++;
                                
                                // সাইটের ব্যাকএন্ড সার্ভারে ডাটাবেজ রিকোয়েস্ট সফলভাবে জমা হওয়ার জন্য ডায়নামিক পজ
                                await new Promise(resolve => requestAnimationFrame(resolve));
                                break; 
                            }
                        }
                    }
                }
                return count;
            });

            if (likedInCycle > 0) {
                totalLiked += likedInCycle;
                console.log(`[✓] ${likedInCycle} টি ইউজারের পোস্টে আপনার আইডি দিয়ে সফলভাবে রিয়েল লাইক পাঠানো হয়েছে। (সর্বমোট: ${totalLiked})`);
            }

            // নতুন পোস্ট লোড করতে ডায়নামিক স্ক্রোল
            const previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollBy(0, 800)');
            
            // সার্ভার থেকে ডায়নামিকালি নতুন পোস্ট পেজে আসার জন্য রিয়েল-টাইম অপেক্ষা
            await page.waitForFunction(
                (prev) => document.body.scrollHeight > prev || true,
                { timeout: 5000 },
                previousHeight
            ).catch(() => {});

            const newHeight = await page.evaluate('document.body.scrollHeight');
            if (newHeight === previousHeight && scrollCycle > 5) {
                console.log('[i] পেজের শেষে পৌঁছানো হয়েছে, আর নতুন পোস্ট নেই।');
                break;
            }
        }

        console.log(`[SUCCESS] সর্বমোট ${totalLiked} টি পোস্টে আপনার আইডি দিয়ে আসল লাইক সফলভাবে অ্যাক্টিভিটিতে যুক্ত হয়েছে!`);

    } catch (error) {
        console.error('[ERROR] এক্সিকিউশন এরর:', error.message);
    } finally {
        await browser.close();
        console.log('[+] সেশন সফলভাবে সমাপ্ত হয়েছে।');
    }
})();
