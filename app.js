const form = document.querySelector("#leadForm");
const steps = Array.from(document.querySelectorAll(".form-step"));
const stepItems = Array.from(document.querySelectorAll("#stepList li"));
const backButton = document.querySelector("#backButton");
const nextButton = document.querySelector("#nextButton");
const submitButton = document.querySelector("#submitButton");
const formError = document.querySelector("#formError");
const scoreValue = document.querySelector("#scoreValue");
const scoreMeter = document.querySelector("#scoreMeter");
const scoreLabel = document.querySelector("#scoreLabel");
const resultPanel = document.querySelector("#resultPanel");
const resultEyebrow = document.querySelector("#resultEyebrow");
const resultTitle = document.querySelector("#resultTitle");
const resultSummary = document.querySelector("#resultSummary");
const debugDetails = document.querySelector("#debugDetails");
const payloadPreview = document.querySelector("#payloadPreview");
const copyPayload = document.querySelector("#copyPayload");
const isLocalPreview = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const gaMeasurementId = window.HOMEPATH_CONFIG?.gaMeasurementId || "";

let currentStep = 0;
let latestPayload = null;
let isSubmitting = false;

const partnerMap = {
  purchase: "Purchase mortgage partner",
  refinance: "Refinance partner",
  heloc: "Home equity partner",
  reverse_mortgage: "Reverse mortgage partner",
};

function loadAnalytics() {
  if (!gaMeasurementId) return;
  if (window.gtag) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", gaMeasurementId);
}

function trackLeadSubmitted(payload, monday) {
  if (!window.gtag) return;
  const eventPayload = {
    loan_goal: payload.intent.loan_goal,
    lead_tier: payload.qualification.lead_tier,
    lead_score: payload.qualification.lead_score,
    monday_item_id: monday?.item_id || "",
  };
  window.gtag("event", "lead_submit", eventPayload);
  window.gtag("event", "generate_lead", {
    currency: "USD",
    value: 1,
    ...eventPayload,
  });
  if (isLocalPreview) console.info("Tracked lead_submit", eventPayload);
}

function trackLeadStarted(payload) {
  if (!window.gtag) return;
  window.gtag("event", "lead_submit", {
    loan_goal: payload.intent.loan_goal,
    lead_tier: payload.qualification.lead_tier,
    lead_score: payload.qualification.lead_score,
    event_stage: "submit_click",
  });
}

function getFormData() {
  return Object.fromEntries(new FormData(form).entries());
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getEquityRatio(data) {
  const value = asNumber(data.propertyValue);
  const balance = asNumber(data.mortgageBalance);
  if (!value) return 0;
  return Math.max(0, Math.min(1, (value - balance) / value));
}

function calculateScore(data) {
  let score = 0;

  if (data.loanGoal) score += 12;
  if (data.timeline === "0_30") score += 24;
  if (data.timeline === "31_90") score += 18;
  if (data.timeline === "3_6") score += 10;

  if (data.state && data.zip) score += 10;
  if (asNumber(data.propertyValue) >= 200000) score += 12;

  const equityRatio = getEquityRatio(data);
  if (["refinance", "heloc", "reverse_mortgage"].includes(data.loanGoal) && equityRatio >= 0.25) {
    score += 16;
  }

  if (["740_plus", "700_739"].includes(data.creditRange)) score += 14;
  if (["660_699", "620_659"].includes(data.creditRange)) score += 8;

  if (data.loanGoal === "reverse_mortgage" && asNumber(data.age) >= 62) score += 16;
  if (data.loanGoal === "reverse_mortgage" && asNumber(data.age) > 0 && asNumber(data.age) < 62) score -= 30;

  if (data.email && data.phone && data.consent) score += 12;

  return Math.max(0, Math.min(100, score));
}

function getLeadTier(score) {
  if (score >= 75) return "Hot";
  if (score >= 48) return "Warm";
  return "Nurture";
}

function updateScore() {
  const data = getFormData();
  const score = calculateScore(data);
  const tier = getLeadTier(score);
  scoreValue.textContent = score;
  scoreMeter.value = score;
  scoreLabel.textContent = `${tier} lead`;
}

function showStep(index) {
  currentStep = index;
  steps.forEach((step, stepIndex) => step.classList.toggle("active", stepIndex === currentStep));
  stepItems.forEach((item, stepIndex) => item.classList.toggle("active", stepIndex === currentStep));
  backButton.classList.toggle("hidden", currentStep === 0);
  nextButton.classList.toggle("hidden", currentStep === steps.length - 1);
  submitButton.classList.toggle("hidden", currentStep !== steps.length - 1);
  formError.textContent = "";
  updateScore();
}

function validateCurrentStep() {
  const fields = Array.from(steps[currentStep].querySelectorAll("input, select"));
  for (const field of fields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      formError.textContent = "Please complete the highlighted field before continuing.";
      return false;
    }
  }
  return true;
}

function buildPayload(data) {
  const score = calculateScore(data);
  const equityRatio = getEquityRatio(data);
  const now = new Date();
  const selectedPartner = partnerMap[data.loanGoal] || "General mortgage partner";

  return {
    lead: {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      state: data.state,
      zip: data.zip,
    },
    intent: {
      loan_goal: data.loanGoal,
      primary_goal: data.primaryGoal,
      timeline: data.timeline,
      selected_partner_type: selectedPartner,
    },
    qualification: {
      property_value: asNumber(data.propertyValue),
      mortgage_balance: asNumber(data.mortgageBalance),
      estimated_equity_ratio: Number(equityRatio.toFixed(2)),
      credit_range: data.creditRange,
      homeowner_age: asNumber(data.age),
      lead_score: score,
      lead_tier: getLeadTier(score),
    },
    workflow: {
      follow_up_status: "New",
    },
    consent: {
      granted: Boolean(data.consent),
      language:
        "I agree to be contacted by HomePath Options and selected licensed mortgage partners about home financing options by phone, text, or email. Consent is not required to buy goods or services. Message and data rates may apply.",
      captured_at: now.toISOString(),
      page_url: window.location.href,
    },
    metadata: {
      source: "static_mvp",
      campaign: "organic_direct",
      version: "2026-05-20-mvp",
    },
  };
}

function summarizePayload(payload) {
  const goal = payload.intent.loan_goal.replaceAll("_", " ");
  return `${payload.qualification.lead_tier} ${goal} lead routed to ${payload.intent.selected_partner_type}. Score: ${payload.qualification.lead_score}/100.`;
}

async function submitLead(payload) {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const responseText = await response.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error("The lead server is not running the Monday API yet. Restart server.mjs and try again.");
  }
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Lead submission failed.");
  }
  return data;
}

backButton.addEventListener("click", () => {
  if (currentStep > 0) showStep(currentStep - 1);
});

nextButton.addEventListener("click", () => {
  if (validateCurrentStep()) showStep(currentStep + 1);
});

form.addEventListener("input", updateScore);
form.addEventListener("change", updateScore);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSubmitting) return;
  if (!validateCurrentStep()) return;

  isSubmitting = true;
  submitButton.textContent = "Sending...";
  submitButton.disabled = true;
  formError.textContent = "";

  try {
    latestPayload = buildPayload(getFormData());
    trackLeadStarted(latestPayload);
    const result = await submitLead(latestPayload);
    latestPayload = result.payload || latestPayload;

    if (result.monday?.configured) {
      if (isLocalPreview) {
        resultEyebrow.textContent = "CRM-ready lead";
        resultTitle.textContent = "Lead sent to Monday";
        const warning = result.monday.column_update?.warning ? ` ${result.monday.column_update.warning}` : "";
        resultSummary.textContent = `${summarizePayload(latestPayload)} Monday item ${result.monday.item_id} was created.${warning}`;
      } else {
        resultEyebrow.textContent = "Request received";
        resultTitle.textContent = "Thanks. Your request has been received.";
        resultSummary.textContent = "A licensed mortgage professional may contact you soon to discuss the home financing option you selected. You are not obligated to apply for or accept any loan product.";
      }
      trackLeadSubmitted(latestPayload, result.monday);
    } else {
      resultEyebrow.textContent = "Local preview";
      resultTitle.textContent = `${latestPayload.qualification.lead_tier} lead captured`;
      resultSummary.textContent = `${summarizePayload(latestPayload)} Monday is ready for configuration before launch.`;
    }

    if (isLocalPreview) {
      debugDetails.classList.remove("hidden");
      payloadPreview.textContent = JSON.stringify(result, null, 2);
    } else {
      debugDetails.classList.add("hidden");
      payloadPreview.textContent = "";
    }
    resultPanel.classList.remove("hidden");
    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    formError.textContent = error.message || "Lead submission failed. Please try again.";
  } finally {
    isSubmitting = false;
    submitButton.textContent = "Create lead";
    submitButton.disabled = false;
  }
});

copyPayload.addEventListener("click", async () => {
  if (!latestPayload) return;
  const text = JSON.stringify(latestPayload, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    copyPayload.textContent = "Copied";
    window.setTimeout(() => {
      copyPayload.textContent = "Copy payload";
    }, 1600);
  } catch {
    formError.textContent = "Copy failed. The payload is still visible below.";
  }
});

showStep(0);
loadAnalytics();
