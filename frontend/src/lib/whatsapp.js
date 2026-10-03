import { fmtDate, today } from './format';

// Default templates. The shop can edit these in Settings; {shop_name} and
// {shop_place} come from the Marathi business name/place in Settings.
export const DEFAULT_TEMPLATES = {
  wa_delivery: `नमस्कार {customer_name},

आज दिनांक {date} रोजी आपल्याला {jar_quantity} पाण्याचे जार देण्यात आले आहेत.

जार दर: ₹{rate}
एकूण रक्कम: ₹{amount}
भरलेली रक्कम: ₹{paid}
उधारी: ₹{udhari}

सध्या आपल्याकडे एकूण {current_jars} जार आहेत.

धन्यवाद.

{shop_name}
{shop_place}`,
  wa_return: `नमस्कार {customer_name},

आज दिनांक {date} रोजी {returned_jars} पाण्याचे जार परत मिळाले.

सध्या आपल्याकडे एकूण {current_jars} जार आहेत.

धन्यवाद.

{shop_name}
{shop_place}`,
  wa_payment: `नमस्कार {customer_name},

आपले ₹{paid_amount} पेमेंट आज दिनांक {date} रोजी प्राप्त झाले आहे.

मागील बाकी: ₹{previous_pending}
भरलेली रक्कम: ₹{paid_amount}
शिल्लक बाकी: ₹{remaining_pending}

धन्यवाद.

{shop_name}
{shop_place}`,
  wa_reminder: `नमस्कार {customer_name},

आपल्या खात्यावर ₹{pending_amount} रक्कम बाकी आहे.

कृपया सोयीने आपली बाकी रक्कम जमा करावी.

धन्यवाद.

{shop_name}
{shop_place}`,
  wa_summary: `{shop_name}
{shop_place}

आजचा व्यवहार
दिनांक: {date}

आज दिलेले जार: {given}

आज परत आलेले जार: {returned}

आजची Cash Collection: ₹{cash}

आजची Udhari: ₹{udhari}

आज मिळालेले Payment: ₹{payments}

एकूण Pending: ₹{pending}

धन्यवाद.`,
};

function amt(v) {
  const n = Number(v) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function fillTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, (m, key) =>
    values[key] !== undefined && values[key] !== null ? String(values[key]) : m
  );
}

function shopValues(settings) {
  return {
    shop_name: settings?.business_name_mr || 'साई वॉटर सप्लायर्स',
    shop_place: settings?.business_place_mr || 'कोळेवाडी',
  };
}

function tpl(settings, key) {
  return settings?.[key] || DEFAULT_TEMPLATES[key];
}

/** Indian mobile → wa.me international format (91XXXXXXXXXX). */
export function waNumber(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
}

// Which WhatsApp app this phone should use: 'business' (WhatsApp Business first, normal
// WhatsApp if Business isn't installed) or 'normal'. Saved per phone, like the language.
const WA_APP_KEY = 'rws_wa_app';
const ANDROID_PACKAGES = { business: 'com.whatsapp.w4b', normal: 'com.whatsapp' };

export function getWaApp() {
  try {
    return localStorage.getItem(WA_APP_KEY) === 'normal' ? 'normal' : 'business';
  } catch {
    return 'business';
  }
}

export function setWaApp(app) {
  try {
    localStorage.setItem(WA_APP_KEY, app === 'normal' ? 'normal' : 'business');
  } catch {
    /* storage blocked: default (business) is used */
  }
}

/**
 * Open WhatsApp with a ready message. With no mobile, WhatsApp asks whom to send to.
 *
 * Android: an intent link names the exact app (WhatsApp Business or normal WhatsApp).
 * If that app isn't installed, Chrome follows the fallback wa.me link, which opens
 * whichever WhatsApp the phone has. iPhone/computer: wa.me only — the system decides
 * the app there, a web page cannot choose.
 */
export function openWhatsApp(mobile, text) {
  const n = mobile ? waNumber(mobile) : '';
  const waMe = `https://wa.me/${n}?text=${encodeURIComponent(text)}`;

  if (/Android/i.test(navigator.userAgent)) {
    const query = (n ? `phone=${n}&` : '') + `text=${encodeURIComponent(text)}`;
    const intent =
      `intent://send?${query}#Intent;scheme=whatsapp;package=${ANDROID_PACKAGES[getWaApp()]};` +
      `S.browser_fallback_url=${encodeURIComponent(waMe)};end`;
    window.location.href = intent;
    return;
  }

  window.open(waMe, '_blank', 'noopener');
}

export const messages = {
  delivery(settings, t) {
    return fillTemplate(tpl(settings, 'wa_delivery'), {
      ...shopValues(settings),
      customer_name: t.customer_name,
      date: fmtDate(t.transaction_date || today()),
      jar_quantity: t.jar_quantity,
      rate: amt(t.rate),
      amount: amt(t.amount),
      paid: amt(Number(t.paid_amount) + Number(t.advance_amount || 0)),
      udhari: amt(t.udhari_amount),
      current_jars: t.current_jars,
    });
  },
  returned(settings, t) {
    return fillTemplate(tpl(settings, 'wa_return'), {
      ...shopValues(settings),
      customer_name: t.customer_name,
      date: fmtDate(t.transaction_date || today()),
      returned_jars: t.jar_quantity,
      current_jars: t.current_jars,
    });
  },
  payment(settings, p) {
    return fillTemplate(tpl(settings, 'wa_payment'), {
      ...shopValues(settings),
      customer_name: p.customer_name,
      date: fmtDate(p.payment_date || today()),
      paid_amount: amt(p.amount),
      previous_pending: amt(p.previous_pending),
      remaining_pending: amt(p.remaining_pending),
    });
  },
  reminder(settings, c) {
    return fillTemplate(tpl(settings, 'wa_reminder'), {
      ...shopValues(settings),
      customer_name: c.name,
      pending_amount: amt(c.pending_amount),
    });
  },
  summary(settings, s) {
    return fillTemplate(tpl(settings, 'wa_summary'), {
      ...shopValues(settings),
      date: fmtDate(s.date || today()),
      given: s.given,
      returned: s.returned,
      cash: amt(s.cash),
      udhari: amt(s.udhari),
      payments: amt(s.payments),
      pending: amt(s.pending),
    });
  },
};

/** Plain-text ledger for sharing a statement on WhatsApp. */
export function ledgerText(settings, customer, rows) {
  const shop = shopValues(settings);
  const lines = rows.slice(-15).map((r) => {
    if (r.entry_type === 'payment') return `${fmtDate(r.entry_date)} | जमा ₹${amt(r.paid)} | बाकी ₹${amt(r.balance)}`;
    if (r.entry_type === 'returned') return `${fmtDate(r.entry_date)} | परत ${r.jars_returned} जार | जार ${r.jar_balance}`;
    return `${fmtDate(r.entry_date)} | दिले ${r.jars_given} जार | ₹${amt(r.amount)} | भरले ₹${amt(r.paid)} | बाकी ₹${amt(r.balance)}`;
  });
  return `नमस्कार ${customer.name},

आपला हिशोब:
${lines.join('\n')}

सध्या आपल्याकडे जार: ${customer.current_jars}
एकूण बाकी: ₹${amt(customer.pending_amount)}

धन्यवाद.

${shop.shop_name}
${shop.shop_place}`;
}
