const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

const results = [];

function recordResult(feature, status, details = '') {
  results.push({ feature, status, details });
  console.log(`${status === 'PASS' ? '✅' : '❌'} [${status}] ${feature}${details ? ` - ${details}` : ''}`);
}

async function setReactInputValue(page, selector, value) {
  await page.evaluate((sel, val) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`Element ${sel} not found`);
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, selector, value);
}

async function runFullVerification() {
  console.log('========================================================');
  console.log('🚀 RIDESHARE FULL FEATURE AUTOMATED UI/E2E VERIFICATION');
  console.log(`Target Frontend: ${BASE_URL}`);
  console.log('========================================================\n');

  if (!fs.existsSync(CHROME_PATH)) {
    console.error('Chrome not found at', CHROME_PATH);
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('   [Browser Console Error]:', msg.text());
    }
  });

  page.on('pageerror', (err) => {
    console.log('   [Page Error]:', err.message);
  });

  try {
    // ----------------------------------------------------
    // 1. Home Page Verification
    // ----------------------------------------------------
    console.log('\n--- 1. HOME PAGE & NAVIGATION ---');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    const pageTitle = await page.title();
    const navText = await page.evaluate(() => document.querySelector('header')?.innerText || '');

    if (navText.includes('Find Rides') && (navText.includes('Offer a Ride') || navText.includes('Log In'))) {
      recordResult('Home Page Loading & Navbar Navigation', 'PASS', `Title: "${pageTitle}"`);
    } else {
      recordResult('Home Page Loading & Navbar Navigation', 'FAIL', 'Navbar elements missing');
    }

    // ----------------------------------------------------
    // 2. Driver Registration & OTP Verification
    // ----------------------------------------------------
    console.log('\n--- 2. DRIVER AUTHENTICATION & OTP VERIFICATION ---');
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#name');

    const driverEmail = `driver_${Date.now()}@testcommute.in`;
    const driverPhone = '98' + Math.floor(10000000 + Math.random() * 90000000);

    await page.type('#name', 'Alok Kumar');
    await page.type('#email', driverEmail);
    await page.type('#phone', driverPhone);
    await page.type('#password', 'SecurePass123!');
    await page.type('#confirmPassword', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // Wait for SPA navigation to /verify-otp
    await page.waitForFunction(() => window.location.pathname.includes('/verify-otp'), { timeout: 10000 });
    const currentUrl = page.url();

    if (currentUrl.includes('/verify-otp')) {
      recordResult('Driver Registration Flow', 'PASS', `Navigated to ${currentUrl}`);

      // Check if Dev OTP banner exists and click Fill Code
      await page.waitForSelector('.alert-banner-info button', { timeout: 5000 });
      await page.click('.alert-banner-info button'); // Clicks "Fill Code"

      // Click "Verify & Continue"
      await page.click('button[type="submit"]');
      await page.waitForFunction(() => !window.location.pathname.includes('/verify-otp'), { timeout: 10000 });

      const postVerifyUrl = page.url();
      recordResult('Driver OTP Verification & Auto-Login', 'PASS', `Navigated to ${postVerifyUrl}`);
    } else {
      recordResult('Driver Registration Flow', 'FAIL', `Expected /verify-otp, got ${currentUrl}`);
    }

    // ----------------------------------------------------
    // 3. Driver Offers a Ride (/create-ride)
    // ----------------------------------------------------
    console.log('\n--- 3. OFFER A RIDE (LISTING FLOW) ---');
    await page.goto(`${BASE_URL}/create-ride`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#origin');

    await page.type('#origin', 'Koramangala 5th Block, Bengaluru');
    await page.type('#destination', 'Electronic City Phase 1, Bengaluru');

    // Set future date time (tomorrow at 09:00 AM in local ISO format YYYY-MM-DDTHH:mm)
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const year = futureDate.getFullYear();
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const day = String(futureDate.getDate()).padStart(2, '0');
    const hours = String(futureDate.getHours()).padStart(2, '0');
    const mins = String(futureDate.getMinutes()).padStart(2, '0');
    const localDateTimeStr = `${year}-${month}-${day}T${hours}:${mins}`;

    await setReactInputValue(page, '#dateTime', localDateTimeStr);
    await setReactInputValue(page, '#seatsAvailable', '4');
    await setReactInputValue(page, '#pricePerSeat', '250');

    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname.includes('/my-rides'), { timeout: 10000 });

    const myRidesUrl = page.url();
    if (myRidesUrl.includes('/my-rides')) {
      recordResult('Offer a Ride Creation & Redirection', 'PASS', 'Ride successfully listed');
    } else {
      recordResult('Offer a Ride Creation & Redirection', 'FAIL', `Expected /my-rides, got ${myRidesUrl}`);
    }

    // ----------------------------------------------------
    // 4. My Rides Dashboard Verification & Extract Ride ID
    // ----------------------------------------------------
    console.log('\n--- 4. MY RIDES DASHBOARD ---');
    await page.waitForSelector('.card');
    const myRidesContent = await page.evaluate(() => document.body.innerText);
    if (myRidesContent.includes('Koramangala 5th Block') && myRidesContent.includes('Electronic City Phase 1')) {
      recordResult('My Rides Dashboard Rendering', 'PASS', 'Newly listed ride found on driver dashboard');
    } else {
      recordResult('My Rides Dashboard Rendering', 'FAIL', 'Listed ride not displayed on dashboard');
    }

    const listedRideHref = await page.$eval('a[href^="/rides/"]', (el) => el.getAttribute('href'));
    const createdRideId = listedRideHref.replace('/rides/', '');
    console.log(`   Captured created Ride ID: ${createdRideId}`);

    // ----------------------------------------------------
    // 5. Passenger Registration & OTP Verification
    // ----------------------------------------------------
    console.log('\n--- 5. PASSENGER REGISTRATION & VERIFICATION ---');
    // Clear localStorage to log out driver cleanly
    await page.evaluate(() => {
      localStorage.clear();
    });

    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#name');

    const passengerEmail = `passenger_${Date.now()}@testcommute.in`;
    const passengerPhone = '91' + Math.floor(10000000 + Math.random() * 90000000);

    await page.type('#name', 'Sunita Rao');
    await page.type('#email', passengerEmail);
    await page.type('#phone', passengerPhone);
    await page.type('#password', 'SecurePass123!');
    await page.type('#confirmPassword', 'SecurePass123!');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.includes('/verify-otp'), { timeout: 10000 });
    await page.waitForSelector('.alert-banner-info button', { timeout: 5000 });
    await page.click('.alert-banner-info button'); // Fill OTP
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.pathname.includes('/verify-otp'), { timeout: 10000 });

    recordResult('Passenger Registration & OTP Verification', 'PASS', 'Passenger active and verified');

    // ----------------------------------------------------
    // 6. Find Rides & Search Autocomplete
    // ----------------------------------------------------
    console.log('\n--- 6. SEARCH RIDES & AUTOCOMPLETE ---');
    await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#destination');

    await page.type('#destination', 'Electronic City');
    await new Promise((r) => setTimeout(r, 600));

    // Submit search
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1200));

    const searchResultsText = await page.evaluate(() => document.body.innerText);
    if (searchResultsText.includes('Koramangala 5th Block') && searchResultsText.includes('₹250')) {
      recordResult('Search Rides Filtering & Result Matching', 'PASS', 'Matching ride found in search results');
    } else {
      recordResult('Search Rides Filtering & Result Matching', 'FAIL', 'Ride not found in search results');
    }

    // ----------------------------------------------------
    // 7. Ride Details Page Loading
    // ----------------------------------------------------
    console.log('\n--- 7. RIDE DETAILS PAGE ---');
    await page.goto(`${BASE_URL}/rides/${createdRideId}`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.card', { timeout: 8000 });

    const detailsUrl = page.url();
    const detailsText = await page.evaluate(() => document.body.innerText);

    if (detailsText.includes('Fare Breakdown') && detailsText.includes('20% Advance Token')) {
      recordResult('Ride Details Page Loading & Fare Calculations', 'PASS', `Loaded ${detailsUrl}`);
    } else {
      recordResult('Ride Details Page Loading & Fare Calculations', 'FAIL', 'Fare breakdown missing');
    }

    // ----------------------------------------------------
    // 8. Seat Booking & Advance Payment Flow
    // ----------------------------------------------------
    console.log('\n--- 8. SEAT BOOKING & PAYMENT MODAL ---');
    await page.waitForSelector('button.btn-cta', { timeout: 5000 });
    await page.click('button.btn-cta');
    await page.waitForSelector('.modal-content', { visible: true });

    // Change seats: Click '+' to select 2 seats
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.modal-content button'));
      const plusBtn = buttons.find((b) => b.innerText.trim() === '+');
      if (plusBtn) plusBtn.click();
    });

    // Enter pickup landmark
    await page.type('#pickupLocation', 'Near Forum Mall Main Gate');

    // Submit Payment
    await page.click('.modal-content button[type="submit"]');

    // Wait for success screen
    await page.waitForFunction(() => {
      const text = document.querySelector('.modal-content')?.innerText || '';
      return text.includes('Advance Payment Received') || text.includes('Booking Confirmed');
    }, { timeout: 12000 });

    const modalText = await page.evaluate(() => document.querySelector('.modal-content')?.innerText || '');

    if (modalText.includes('Advance Payment Received') || modalText.includes('Booking Confirmed')) {
      recordResult('Seat Booking & Advance Payment Processing', 'PASS', 'Payment succeeded with transaction ID');
    } else {
      recordResult('Seat Booking & Advance Payment Processing', 'FAIL', `Payment failed: ${modalText}`);
    }

    // Navigate to My Bookings
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.modal-content button'));
      const viewBookingsBtn = buttons.find((b) => b.innerText.includes('View My Bookings'));
      if (viewBookingsBtn) viewBookingsBtn.click();
    });
    await page.waitForFunction(() => window.location.pathname.includes('/my-bookings'), { timeout: 10000 });

    // ----------------------------------------------------
    // 9. My Bookings Dashboard
    // ----------------------------------------------------
    console.log('\n--- 9. MY BOOKINGS DASHBOARD ---');
    await page.waitForSelector('.card');
    const bookingsPageText = await page.evaluate(() => document.body.innerText);

    if (bookingsPageText.includes('Confirmed') && bookingsPageText.includes('Near Forum Mall Main Gate')) {
      recordResult('My Bookings Dashboard Rendering', 'PASS', 'Booking appears with Confirmed status and pickup point');
    } else {
      recordResult('My Bookings Dashboard Rendering', 'FAIL', 'Booking not found on passenger dashboard');
    }

    // ----------------------------------------------------
    // 10. In-App Messaging
    // ----------------------------------------------------
    console.log('\n--- 10. IN-APP MESSAGING FLOW ---');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const chatBtn = buttons.find((b) => b.innerText.includes('Driver Chat') || b.innerText.includes('Chat'));
      if (chatBtn) chatBtn.click();
    });

    await page.waitForSelector('.modal-content input[type="text"]', { visible: true, timeout: 5000 });
    await page.type('.modal-content input[type="text"]', 'Hi Driver! I will be at the gate by 8:45 AM.');
    await page.click('.modal-content form button[type="submit"]');

    await new Promise((r) => setTimeout(r, 1200));
    const chatMessages = await page.evaluate(() => document.querySelector('.modal-content')?.innerText || '');

    if (chatMessages.includes('Hi Driver! I will be at the gate by 8:45 AM.')) {
      recordResult('In-App Passenger Message Dispatch & Display', 'PASS', 'Message sent and rendered in chat drawer');
    } else {
      recordResult('In-App Passenger Message Dispatch & Display', 'FAIL', 'Message not found in chat drawer');
    }

    // Close chat modal (Escape key)
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 500));

    // ----------------------------------------------------
    // 11. Booking Cancellation & Seat Restoration
    // ----------------------------------------------------
    console.log('\n--- 11. BOOKING CANCELLATION FLOW ---');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const cancelBtn = buttons.find((b) => b.innerText.includes('Cancel Booking'));
      if (cancelBtn) cancelBtn.click();
    });

    await page.waitForSelector('.modal-content', { visible: true, timeout: 5000 });

    // Click Confirm Cancellation
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.modal-content button'));
      const confirmCancelBtn = buttons.find((b) => b.innerText.includes('Yes, Cancel Booking'));
      if (confirmCancelBtn) confirmCancelBtn.click();
    });

    await new Promise((r) => setTimeout(r, 1500));
    const postCancelText = await page.evaluate(() => document.body.innerText);

    if (postCancelText.includes('Cancelled') || postCancelText.includes('Refunded')) {
      recordResult('Booking Cancellation & Refund Flow', 'PASS', 'Booking cancelled and marked refunded');
    } else {
      recordResult('Booking Cancellation & Refund Flow', 'FAIL', 'Booking status did not update to cancelled');
    }

  } catch (err) {
    console.error('\n❌ Unhandled exception during browser verification:', err);
    recordResult('Complete Flow Execution', 'FAIL', err.message);
  } finally {
    await browser.close();
  }

  console.log('\n========================================================');
  console.log(`📊 BROWSER VERIFICATION SUMMARY: ${results.filter((r) => r.status === 'PASS').length} / ${results.length} PASSED`);
  console.log('========================================================\n');
}

runFullVerification().catch(console.error);
