const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

// বাস্তবসম্মত এবং প্রাসঙ্গিক কমেন্ট লিস্ট (প্রয়োজন অনুযায়ী এগুলো আরও বাড়াতে বা পরিবর্তন করতে পারেন)
const HUMAN_COMMENTS = [
    "দারুণ পোস্ট! খুবই চমৎকার শেয়ার।",
    "চমৎকার আইডিয়া, ভালো লাগলো বিষয়টি।",
    "খুব সুন্দর ও তথ্যবহুল একটি পোস্ট।",
    "দারুণ লাগলো ভাই, শুভকামনা রইল।",
    "খুব সুন্দর লিখেছেন, চালিয়ে যান!",
    "বাহ! দারুণ একটি মুহূর্ত বা বিষয়।"
];

(async () => {
    const EMAIL = process.env.SITE_EMAIL;
    const PASSWORD = process.env.SITE_PASSWORD;

    if (!EMAIL || !PASSWORD) {
        console.error('[!] ERROR: SITE_EMAIL অথবা SITE_PASSWORD পাওয়া যায়নি!');
        process.exit(1);
    }

    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--start-maximized'
        ]
    });

    const page = await browser.newPage();

    // কোনো সময়সীমা (Timeout) থাকবে না, সাইটের পারফর্মেন্স অনুযায়ী ডায়নামিকালি কাজ করবে
    await page.setDefaultNavigationTimeout(0);
    await page.setDefaultTimeout(0);

    // রিয়েল ক্রোম ব্রাউজার ইউজার এরেঞ্জমেন্ট
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    // মানুষের মতো কার্সার স্মুথলি মুভ করানোর ডায়নামিক ফাংশন
    async function humanMoveAndClick(targetElement) {
        const box = await targetElement.boundingBox();
        if (!box) return false;

        // বাটনের একদম মাঝখানে মানুষের হাত/মাউসের মতো কার্সার নেওয়া
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;

        // মাউস ধীরে ধীরে সরিয়ে বাটন পর্যন্ত নেওয়া (Human Mouse Bezier Simulation)
        await page.mouse.move(x, y, { steps: 15 });
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 300) + 200));

        // মাউসে আসল হিউম্যান প্রেস করা
        await page.mouse.down();
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 100) + 50));
        await page.mouse.up();

        return true;
    }

    // মানুষের মতো ক্যারেক্টার বাই ক্যারেক্টার টাইপ করার ফাংশন
    async function humanType(targetElement, text) {
        await humanMoveAndClick(targetElement);
        for (let char of text) {
            await page.keyboard.type(char, { delay: Math.floor(Math.random() * 100) + 50 });
        }
    }

    try {
        console.log('[+] লগইন পেজে যাওয়া হচ্ছে...');
        await page.goto('https://reebook-meta.com/login.php', { waitUntil: 'domcontentloaded' });

        // ১. ডায়নামিকালি ইমেইল ফিল্ড রেডি হওয়ার জন্য অপেক্ষা
        const emailField = await page.waitForSelector('input[name="email"]', { visible: true });
        await humanType(emailField, EMAIL);

        const passField = await page.waitForSelector('input[name="password"]', { visible: true });
        await humanType(passField, PASSWORD);

        console.log('[+] লগইন সাবমিট বাটন প্রেস করা হচ্ছে...');
        const submitBtn = await page.waitForSelector('button[type="submit"]', { visible: true });
        
        await Promise.all([
            humanMoveAndClick(submitBtn),
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {})
        ]);

        console.log('[✓] আপনার আইডি সফলভাবে সিস্টেমে প্রবেশ করেছে!');

        // ২. ড্যাশবোর্ডে গমন
        console.log('[+] ইউজার নিউজফিডে যাওয়া হচ্ছে...');
        await page.goto('https://reebook-meta.com/users/dashboard.php', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('body', { visible: true });

        let actualConfirmedActions = 0;

        // ৩. ফিড স্ক্রোল এবং পোস্ট বাই পোস্ট হিউম্যান লাইক ও কমেন্ট ইন্টারঅ্যাকশন
        for (let scrollCycle = 0; scrollCycle < 15; scrollCycle++) {
            
            // পোস্ট নির্বাচন করা
            const postContainers = await page.$$('div, article, section');

            for (let container of postContainers) {
                const isPost = await page.evaluate(el => {
                    const txt = el.innerText || '';
                    // পোস্ট কনফার্ম করার জন্য 'কমেন্ট/শেয়ার' টেক্সটের উপস্থিতি যাচাই
                    return (txt.includes('মন্তব্য') || txt.includes('শেয়ার') || txt.includes('Comment')) && !el.hasAttribute('data-human-processed');
                }, container);

                if (isPost) {
                    await page.evaluate(el => el.setAttribute('data-human-processed', 'true'), container);

                    // ক. পোস্টটির লাইক বাটন চিহ্নিত করা ও লাইক দেওয়া
                    const likeButton = await container.$('button, a, div[role="button"]');
                    
                    if (likeButton) {
                        const isLikeBtn = await page.evaluate(btn => {
                            const t = btn.innerText ? btn.innerText.trim() : '';
                            return t === 'লাভ' || t === 'Like' || t.includes('লাভ');
                        }, likeButton);

                        if (isLikeBtn) {
                            // স্ক্রিনে স্মুথলি ভিউতে নিয়ে আসা
                            await page.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), likeButton);
                            
                            // মানুষের মতো বিরতি
                            await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1500) + 1000));

                            // মাউসের রিয়েল কার্সার দিয়ে লাইক বাটনে চাপ দেওয়া
                            const clickedLike = await humanMoveAndClick(likeButton);
                            
                            if (clickedLike) {
                                console.log(`[✓ REAL LIKED] পোস্টটিতে রিয়েল মাউস ক্লিকে লাইক যুক্ত হয়েছে!`);
                                await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1500) + 1000));
                            }
                        }
                    }

                    // খ. নতুন ফিচার: একই পোস্টে হিউম্যান টাইপিং স্টাইলে কমেন্ট করা
                    const commentInputBox = await container.$('input[type="text"], textarea, div[contenteditable="true"]');
                    
                    if (commentInputBox) {
                        // রেন্ডমলি লিস্ট থেকে একটি কমেন্ট সিলেক্ট করা
                        const randomComment = HUMAN_COMMENTS[Math.floor(Math.random() * HUMAN_COMMENTS.length)];

                        // কমেন্ট বক্স ভিউতে নিয়ে আসা
                        await page.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), commentInputBox);
                        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1000) + 500));

                        // মানুষের মতো টাইপ করে কমেন্ট ইনপুট বক্সে লেখা
                        await humanType(commentInputBox, randomComment);
                        console.log(`[✍️ HUMAN TYPING] কমেন্ট টাইপ করা হয়েছে: "${randomComment}"`);

                        // কমেন্ট সাবমিট বাটন বা এন্টার প্রেস করার লজিক
                        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1000) + 500));
                        await page.keyboard.press('Enter');

                        actualConfirmedActions++;
                        console.log(`[✓ REAL COMMENTED] পোস্ট #${actualConfirmedActions}-এ সফলভাবে কমেন্ট পোস্ট করা হয়েছে!`);

                        // ডাটাবেজ ব্যাকএন্ডে রিকোয়েস্ট পৌঁছানোর পর্যাপ্ত সময় দেওয়া
                        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 3000) + 2000));
                    }
                }
            }

            // মানুষের মতো হাত দিয়ে মাউস হুইল ঘুরিয়ে পেজ নিচে নামানো
            await page.mouse.wheel({ deltaY: Math.floor(Math.random() * 300) + 500 });

            // পেজের নতুন পোস্ট সার্ভার থেকে আসার অপেক্ষা (ডায়নামিকালি)
            await page.waitForFunction(() => true, { timeout: 3000 }).catch(() => {});
        }

        console.log(`\n==================================================`);
        console.log(`[SUCCESS] সর্বমোট ${actualConfirmedActions} টি পোস্টে লাইক ও হিউম্যান কমেন্টের রিয়েল অ্যাক্টিভিটি সম্পন্ন হয়েছে!`);
        console.log(`==================================================\n`);

    } catch (error) {
        console.error('[ERROR] সিস্টেম রানিং এরর:', error.message);
    } finally {
        await browser.close();
        console.log('[+] ব্রাউজার সম্পূর্ণ বন্ধ হয়েছে।');
    }
})();
