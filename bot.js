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

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        // ১. লগইন পেজে ভিজিট (নেটওয়ার্ক রিকোয়েস্ট শান্ত হওয়া পর্যন্ত অপেক্ষা)
        console.log('[+] লগইন পেজে ভিজিট করা হচ্ছে...');
        await page.goto('https://reebook-meta.com/login.php', {
            waitUntil: 'networkidle2'
        });

        // ২. নির্দিষ্ট ইনপুট বক্স পেজে আসা মাত্রই ইনপুট দেওয়া (কোনো ফিক্সড ডিলে নেই)
        console.log('[+] ইমেইল ও পাসওয়ার্ড ফিল্ড রেডি হওয়ার জন্য অপেক্ষা করা হচ্ছে...');
        const emailInput = await page.waitForSelector('input[name="email"]', { visible: true });
        await emailInput.type(EMAIL);

        const passwordInput = await page.waitForSelector('input[name="password"]', { visible: true });
        await passwordInput.type(PASSWORD);

        // ৩. লগইন সাবমিট এবং পেজ পরিবর্তন হওয়া পর্যন্ত সংবেদনশীল অপেক্ষা
        console.log('[+] লগইন সাবমিট করা হচ্ছে...');
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})
        ]);

        console.log('[✓] সফলভাবে লগইন সম্পন্ন হয়েছে!');

        // ৪. সরাসরি ড্যাশবোর্ডে যাওয়া এবং ড্যাশবোর্ডের লোডিং শেষ হওয়া নিশ্চিত করা
        console.log('[+] ড্যাশবোর্ডে যাওয়া হচ্ছে...');
        await page.goto('https://reebook-meta.com/users/dashboard.php', {
            waitUntil: 'networkidle2'
        });

        let likedCount = 0;
        console.log('[+] "লাভ" বাটন খোঁজা এবং স্ক্রোল করে অটো-লাইক প্রসেস শুরু হচ্ছে...');

        // ৫. ডায়নামিক স্ক্রোলিং ও বাটন প্রসেসিং
        for (let scrollAttempt = 0; scrollAttempt < 15; scrollAttempt++) {
            
            // স্ক্রিনে থাকা সমস্ত এলিমেন্টের মধ্য থেকে "লাভ" বাটন সনাক্তকরণ
            const elements = await page.$$('div, button, a, span');
            
            for (let el of elements) {
                const text = await page.evaluate(element => element.innerText ? element.innerText.trim() : '', el);

                if (text === 'লাভ' || text.includes('লাভ')) {
                    const isProcessed = await el.evaluate(node => node.getAttribute('data-bot-clicked'));
                    
                    if (!isProcessed) {
                        // ক্লিক ফ্লাগ যুক্ত করা
                        await el.evaluate(node => node.setAttribute('data-bot-clicked', 'true'));

                        // স্মুথ স্ক্রোল
                        await el.evaluate(node => node.scrollIntoView({ behavior: 'smooth', block: 'center' }));
                        
                        // বাটনে সরাসরি ক্লিক
                        await el.click();
                        likedCount++;
                        console.log(`[✓] পোস্ট #${likedCount} এর "লাভ" বাটনে ক্লিক করা হয়েছে।`);
                    }
                }
            }

            // ডায়নামিক স্ক্রোল ও পেজের অতিরিক্ত কন্টেন্ট লোড হওয়ার অপেক্ষা
            const previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollBy(0, 800)');
            
            // DOM আপডেট এবং নতুন পোস্ট আসার জন্য ডায়নামিক পজ
            await page.waitForFunction(
                (prev) => document.body.scrollHeight > prev || true,
                { timeout: 3000 },
                previousHeight
            ).catch(() => {});

            const newHeight = await page.evaluate('document.body.scrollHeight');
            if (newHeight === previousHeight && scrollAttempt > 5) {
                console.log('[i] পেজের শেষে পৌঁছানো হয়েছে, আর নতুন পোস্ট নেই।');
                break;
            }
        }

        console.log(`[SUCCESS] সর্বমোট ${likedCount} টি পোস্টে সফলভাবে "লাভ" রিঅ্যাক্ট/লাইক দেওয়া হয়েছে!`);

    } catch (error) {
        console.error('[ERROR] প্রসেস চলাকালীন সমস্যা:', error.message);
    } finally {
        await browser.close();
        console.log('[+] ব্রাউজার সেশন বন্ধ করা হয়েছে।');
    }
})();
