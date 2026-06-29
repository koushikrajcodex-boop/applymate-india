(function () {
  const SUPPORT_EMAIL = "koushikrajcodex@gmail.com";

  const PAGE_CONFIGS = {
    "index.html": {
      type: "home",
      title: "ApplyMate Assistant",
      subtitle: "Scholarship finder help • No API key used",
      welcome:
        "Hi bro 👋 I can help you use the scholarship finder, understand eligibility, documents, income limits, categories, and official portal checks.",
      questions: [
        "How to check eligibility?",
        "Documents needed?",
        "Show engineering scholarships",
        "Show girls scholarships",
        "What income limit?",
        "Is ApplyMate official?"
      ]
    },

    "dashboard.html": {
      type: "dashboard",
      title: "Dashboard Assistant",
      subtitle: "Profile • Saved scholarships • Tracker",
      welcome:
        "Hi bro 👋 I can help you use the dashboard, save scholarships, update tracker status, compare schemes, and understand recommendations.",
      questions: [
        "How to save scholarships?",
        "What does Under Review mean?",
        "How recommendations work?",
        "How to compare scholarships?",
        "What should I track?",
        "Is dashboard official?"
      ]
    },

    "scholarships.html": {
      type: "scholarships",
      title: "Scholarship Directory Assistant",
      subtitle: "Browse • Compare • Filter",
      welcome:
        "Hi bro 👋 I can help you browse scholarship categories, compare options, and understand which schemes may match your state, course, category, or income.",
      questions: [
        "Show national scholarships",
        "Show AP scholarships",
        "Show Telangana scholarships",
        "Show engineering scholarships",
        "Show SC/ST scholarships",
        "How to verify details?"
      ]
    },

    "guides.html": {
      type: "guides",
      title: "Guide Assistant",
      subtitle: "Find the right guide",
      welcome:
        "Hi bro 👋 Tell me what you need help with — NSP, OTR, status tracking, documents, mistakes, AP, Telangana, engineering, or girl student scholarships.",
      questions: [
        "Which guide should I read?",
        "NSP OTR help",
        "Status tracking help",
        "Documents guide",
        "Mistakes to avoid",
        "Engineering scholarship guide"
      ]
    },

    "login.html": {
      type: "login",
      title: "Login Help Assistant",
      subtitle: "Account • Register • Dashboard access",
      welcome:
        "Hi bro 👋 I can help you understand login, registration, dashboard access, saved scholarships, password issues, and what data is used.",
      questions: [
        "How to register?",
        "Why should I login?",
        "Password not working",
        "Is account free?",
        "What data is saved?",
        "Where is dashboard?"
      ]
    },

    "nsp-otr-guide.html": {
      type: "guide-article",
      guide: "nsp-otr",
      title: "NSP OTR Guide Assistant",
      subtitle: "OTR • Documents • Common mistakes",
      welcome:
        "Hi bro 👋 I can explain NSP OTR, required details, common mistakes, and what to do after OTR registration.",
      questions: [
        "Summarize this guide",
        "What is NSP OTR?",
        "Documents for OTR?",
        "Mistakes to avoid",
        "After OTR what next?",
        "Is ApplyMate official?"
      ]
    },

    "scholarship-status-guide.html": {
      type: "guide-article",
      guide: "status",
      title: "Status Guide Assistant",
      subtitle: "Pending • Approved • Rejected • Payment",
      welcome:
        "Hi bro 👋 I can explain scholarship status meanings like pending, institute verification, approved, rejected, and payment processing.",
      questions: [
        "Summarize this guide",
        "Pending at institute?",
        "What if rejected?",
        "Payment processing meaning?",
        "How to track status?",
        "Use ApplyMate tracker?"
      ]
    },

    "scholarship-mistakes-to-avoid.html": {
      type: "guide-article",
      guide: "mistakes",
      title: "Mistakes Guide Assistant",
      subtitle: "Avoid rejection and delays",
      welcome:
        "Hi bro 👋 I can explain common scholarship mistakes and how to avoid rejection, delay, wrong documents, and verification problems.",
      questions: [
        "Summarize this guide",
        "Biggest mistakes?",
        "Why applications get rejected?",
        "Document mistakes?",
        "Bank detail mistakes?",
        "How to avoid delay?"
      ]
    },

    "nsp-scholarship-guide.html": {
      type: "guide-article",
      guide: "nsp",
      title: "NSP Guide Assistant",
      subtitle: "National Scholarship Portal help",
      welcome:
        "Hi bro 👋 I can help you understand NSP basics, scholarship application checks, documents, and official portal verification.",
      questions: [
        "Summarize this guide",
        "What is NSP?",
        "Documents needed?",
        "How to apply?",
        "Common NSP mistakes?",
        "Official portal reminder"
      ]
    },

    "ap-jnanabhumi-guide.html": {
      type: "guide-article",
      guide: "ap",
      title: "AP Jnanabhumi Assistant",
      subtitle: "Andhra Pradesh scholarship help",
      welcome:
        "Hi bro 👋 I can help you understand AP Jnanabhumi scholarship basics, documents, eligibility checks, and status tracking.",
      questions: [
        "Summarize this guide",
        "AP documents?",
        "Who can apply?",
        "How to track status?",
        "Common mistakes?",
        "Official portal reminder"
      ]
    },

    "telangana-epass-guide.html": {
      type: "guide-article",
      guide: "telangana",
      title: "Telangana ePASS Assistant",
      subtitle: "Telangana scholarship help",
      welcome:
        "Hi bro 👋 I can help you understand Telangana ePASS basics, documents, eligibility checks, and application status.",
      questions: [
        "Summarize this guide",
        "ePASS documents?",
        "Who can apply?",
        "How to track status?",
        "Common mistakes?",
        "Official portal reminder"
      ]
    },

    "engineering-scholarships.html": {
      type: "guide-article",
      guide: "engineering",
      title: "Engineering Scholarship Assistant",
      subtitle: "Technical education scholarship help",
      welcome:
        "Hi bro 👋 I can help engineering students understand scholarship categories, documents, AICTE schemes, and eligibility checks.",
      questions: [
        "Summarize this guide",
        "Engineering scholarships?",
        "AICTE schemes?",
        "Documents needed?",
        "Girls engineering scholarships?",
        "How to check eligibility?"
      ]
    },

    "girl-student-scholarships.html": {
      type: "guide-article",
      guide: "girls",
      title: "Girl Student Scholarship Assistant",
      subtitle: "Scholarship help for girls",
      welcome:
        "Hi bro 👋 I can help explain scholarships for girl students, technical education schemes, documents, and eligibility checks.",
      questions: [
        "Summarize this guide",
        "Girls scholarships?",
        "AICTE Pragati?",
        "Documents needed?",
        "Eligibility checks?",
        "How to apply safely?"
      ]
    },

    "documents-needed-for-scholarships.html": {
      type: "guide-article",
      guide: "documents",
      title: "Document Checklist Assistant",
      subtitle: "Scholarship document help",
      welcome:
        "Hi bro 👋 I can help you understand common scholarship documents, certificates, bank details, and upload mistakes.",
      questions: [
        "Summarize this guide",
        "Documents needed?",
        "Income certificate?",
        "Caste certificate?",
        "Bank details?",
        "Upload mistakes?"
      ]
    }
  };

  function getCurrentPageName() {
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf("/") + 1);
    return page || "index.html";
  }

  function getPageConfig() {
    const page = getCurrentPageName();
    return (
      PAGE_CONFIGS[page] || {
        type: "general",
        title: "ApplyMate Assistant",
        subtitle: "Student scholarship help",
        welcome:
          "Hi bro 👋 I can help with scholarships, eligibility, documents, application status, and official portal reminders.",
        questions: [
          "How to check eligibility?",
          "Documents needed?",
          "How to track status?",
          "Is ApplyMate official?"
        ]
      }
    );
  }

  function createAssistant() {
    if (document.getElementById("applymateAssistant")) return;

    const config = getPageConfig();

    const toggle = document.createElement("button");
    toggle.className = "assistant-toggle";
    toggle.type = "button";
    toggle.textContent = "Ask ApplyMate";

    const box = document.createElement("div");
    box.className = "assistant-box";
    box.id = "applymateAssistant";

    box.innerHTML = `
      <div class="assistant-header">
        <div>
          <div class="assistant-title">${escapeHtml(config.title)}</div>
          <div class="assistant-subtitle">${escapeHtml(config.subtitle)}</div>
        </div>
        <button class="assistant-close" type="button" aria-label="Close assistant">×</button>
      </div>

      <div class="assistant-messages" id="assistantMessages"></div>

      <div class="assistant-quick" id="assistantQuick"></div>

      <form class="assistant-form" id="assistantForm">
        <input
          class="assistant-input"
          id="assistantInput"
          type="text"
          placeholder="Ask about scholarships..."
          autocomplete="off"
        />
        <button class="assistant-send" type="submit">Send</button>
      </form>

      <div class="assistant-note">
        General guidance only. Always verify final details on official portals.
      </div>
    `;

    document.body.appendChild(toggle);
    document.body.appendChild(box);

    const closeBtn = box.querySelector(".assistant-close");
    const form = box.querySelector("#assistantForm");
    const input = box.querySelector("#assistantInput");
    const quick = box.querySelector("#assistantQuick");

    toggle.addEventListener("click", () => {
      box.classList.toggle("open");

      if (box.classList.contains("open") && !box.dataset.started) {
        box.dataset.started = "true";
        botMessage(config.welcome);
      }
    });

    closeBtn.addEventListener("click", () => {
      box.classList.remove("open");
    });

    config.questions.forEach((question) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "assistant-chip";
      chip.textContent = question;
      chip.addEventListener("click", () => {
        handleUserMessage(question);
      });
      quick.appendChild(chip);
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const value = input.value.trim();
      if (!value) return;

      input.value = "";
      handleUserMessage(value);
    });
  }

  function handleUserMessage(text) {
    userMessage(text);

    setTimeout(() => {
      botMessage(getAssistantReply(text));
    }, 300);
  }

  function userMessage(text) {
    addMessage(text, "user");
  }

  function botMessage(text) {
    addMessage(text, "bot");
  }

  function addMessage(text, type) {
    const messages = document.getElementById("assistantMessages");
    if (!messages) return;

    const message = document.createElement("div");
    message.className = `assistant-message ${type}`;
    message.innerHTML = formatReply(text);

    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  }

  function formatReply(text) {
    return escapeHtml(text)
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  }

  function getAssistantReply(input) {
    const text = input.toLowerCase();
    const config = getPageConfig();

    if (config.type === "login") {
      const loginReply = getLoginReply(text);
      if (loginReply) return loginReply;
    }

    if (config.type === "guides" || config.type === "guide-article") {
      const guideReply = getGuideReply(text, config);
      if (guideReply) return guideReply;
    }

    if (config.type === "dashboard") {
      const dashboardReply = getDashboardReply(text);
      if (dashboardReply) return dashboardReply;
    }

    if (config.type === "scholarships") {
      const directoryReply = getDirectoryReply(text);
      if (directoryReply) return directoryReply;
    }

    return getGeneralScholarshipReply(text);
  }

  function getLoginReply(text) {
    if (containsAny(text, ["register", "create account", "sign up", "signup", "new account"])) {
      return (
        "To register:\n\n" +
        "1. Enter your email.\n" +
        "2. Enter a password with at least 6 characters.\n" +
        "3. Click **Register**.\n" +
        "4. After account creation, open the dashboard to save scholarships and track applications.\n\n" +
        "Use a real email you can access. Do not share your password with anyone."
      );
    }

    if (containsAny(text, ["login", "sign in", "signin", "dashboard access"])) {
      return (
        "To login:\n\n" +
        "1. Enter your registered email.\n" +
        "2. Enter your password.\n" +
        "3. Click **Login**.\n" +
        "4. After login, go to **Dashboard**.\n\n" +
        "The dashboard helps you save scholarships, complete your profile, compare options, and track application status."
      );
    }

    if (containsAny(text, ["password", "forgot", "reset", "not working", "wrong password"])) {
      return (
        "If your password is not working:\n\n" +
        "• Check email spelling.\n" +
        "• Check caps lock.\n" +
        "• Make sure the password has at least 6 characters.\n" +
        "• If password reset is not added yet, the developer can add a **Forgot Password** button using Firebase password reset.\n\n" +
        "For now, try the correct registered email and password."
      );
    }

    if (containsAny(text, ["free", "payment", "cost", "money", "paid"])) {
      return (
        "ApplyMate India account access should be **free**.\n\n" +
        "Do not pay anyone just to view scholarships on ApplyMate. Scholarship applications must be completed only on official portals."
      );
    }

    if (containsAny(text, ["data", "privacy", "saved", "profile", "email", "safe"])) {
      return (
        "ApplyMate may use your account to save basic dashboard data like:\n\n" +
        "• Email login\n" +
        "• Basic profile details\n" +
        "• Saved scholarships\n" +
        "• Manual application tracker entries\n\n" +
        "Avoid entering sensitive document numbers unless the app clearly needs them. Final scholarship applications should be done on official portals."
      );
    }

    if (containsAny(text, ["why", "benefit", "need account", "why login"])) {
      return (
        "Login is useful because it lets you:\n\n" +
        "• Save scholarships for later\n" +
        "• Complete your profile\n" +
        "• See personalized recommendations\n" +
        "• Track application status\n" +
        "• Compare scholarships\n\n" +
        "You can still browse basic scholarship info without treating ApplyMate as an official portal."
      );
    }

    return null;
  }

  function getGuideReply(text, config) {
    if (containsAny(text, ["which guide", "what guide", "guide should", "where should", "help me choose"])) {
      return (
        "Choose guide based on your problem:\n\n" +
        "• **NSP / OTR** → Read NSP OTR Guide.\n" +
        "• **Application pending / rejected / payment** → Read Scholarship Status Guide.\n" +
        "• **Avoid rejection** → Read Scholarship Mistakes to Avoid.\n" +
        "• **Documents** → Read Documents Needed guide.\n" +
        "• **AP students** → Read AP Jnanabhumi guide.\n" +
        "• **Telangana students** → Read Telangana ePASS guide.\n" +
        "• **Engineering** → Read Engineering Scholarships guide.\n" +
        "• **Girl students** → Read Girl Student Scholarships guide."
      );
    }

    if (containsAny(text, ["summarize", "summary", "this guide", "explain page", "main points"])) {
      return getGuideSummary(config.guide);
    }

    if (containsAny(text, ["official", "government", "real portal", "applymate official"])) {
      return (
        "ApplyMate India is **not an official government portal**.\n\n" +
        "Use ApplyMate for guidance, checklists, and planning. Final eligibility, deadline, document rules, and application status must be verified on the official scholarship portal."
      );
    }

    if (containsAny(text, ["document", "documents", "certificate", "papers", "upload"])) {
      return (
        "Common scholarship documents usually include:\n\n" +
        "• Aadhaar card\n" +
        "• Income certificate\n" +
        "• Caste/category/community certificate if applicable\n" +
        "• Disability certificate if applicable\n" +
        "• Previous marks memo\n" +
        "• Bank account details\n" +
        "• Bonafide or institution certificate\n" +
        "• Admission proof\n\n" +
        "Exact documents change by scheme, so check the official notification before applying."
      );
    }

    if (containsAny(text, ["mistake", "avoid", "rejected", "rejection", "delay"])) {
      return (
        "Common mistakes to avoid:\n\n" +
        "• Waiting until the last date\n" +
        "• Name mismatch with Aadhaar/marks memo\n" +
        "• Wrong income or category certificate\n" +
        "• Blurry document upload\n" +
        "• Wrong bank account or IFSC\n" +
        "• Selecting the wrong scheme\n" +
        "• Forgetting institute verification\n" +
        "• Not checking correction window"
      );
    }

    if (containsAny(text, ["status", "pending", "approved", "payment", "track", "under review"])) {
      return (
        "To track scholarship status:\n\n" +
        "1. Login to the official scholarship portal.\n" +
        "2. Open application status / track status / student dashboard.\n" +
        "3. Check if it is pending, verified, approved, rejected, or payment processing.\n" +
        "4. If it says **Pending at Institute**, contact your school or college scholarship section.\n\n" +
        "ApplyMate tracker is only for your personal planning."
      );
    }

    if (containsAny(text, ["nsp", "otr", "national scholarship portal"])) {
      return (
        "NSP means **National Scholarship Portal**. OTR usually means **One Time Registration**.\n\n" +
        "Keep Aadhaar details, mobile number, email, bank details, school/college info, income certificate, category certificate if needed, and marks memo ready."
      );
    }

    return null;
  }

  function getGuideSummary(guide) {
    const summaries = {
      "nsp-otr":
        "This guide explains **NSP OTR**.\n\n" +
        "Main points:\n" +
        "• OTR means One Time Registration on NSP.\n" +
        "• Keep Aadhaar, mobile, email, bank, school/college, income, category, and marks details ready.\n" +
        "• Avoid name mismatch, inactive mobile number, unclear documents, wrong scheme selection, and last-date rush.\n" +
        "• After OTR, login to the official portal, choose eligible schemes, apply, submit, and track status.",

      status:
        "This guide explains **scholarship status tracking**.\n\n" +
        "Main points:\n" +
        "• Check status only on the official scholarship portal.\n" +
        "• Pending at Institute means your school/college may need to verify.\n" +
        "• Rejected means there may be eligibility, document, income, bank, or scheme issues.\n" +
        "• Payment processing means payment may be under transfer steps.\n" +
        "• Use ApplyMate dashboard only as a personal tracker.",

      mistakes:
        "This guide explains **scholarship mistakes to avoid**.\n\n" +
        "Main points:\n" +
        "• Do not wait until the last date.\n" +
        "• Keep name, Aadhaar, marks memo, and bank details consistent.\n" +
        "• Upload clear documents.\n" +
        "• Choose the correct scholarship scheme.\n" +
        "• Check income limits.\n" +
        "• Track institute verification and correction windows.",

      nsp:
        "This guide explains **NSP scholarship basics**.\n\n" +
        "Main points:\n" +
        "• NSP is used for many central and some state-linked scholarship schemes.\n" +
        "• Students should check eligibility, documents, deadlines, and scheme guidelines.\n" +
        "• Final application must be done only on the official NSP portal.",

      ap:
        "This guide explains **AP Jnanabhumi scholarship basics**.\n\n" +
        "Main points:\n" +
        "• Useful for Andhra Pradesh students.\n" +
        "• Check state/category/course eligibility.\n" +
        "• Keep income, caste/category, bank, Aadhaar, marks, and bonafide documents ready.\n" +
        "• Verify final rules on Jnanabhumi.",

      telangana:
        "This guide explains **Telangana ePASS scholarship basics**.\n\n" +
        "Main points:\n" +
        "• Useful for Telangana students.\n" +
        "• Check course, category, income, and institution requirements.\n" +
        "• Track application and verification status on official ePASS portal.",

      engineering:
        "This guide explains **engineering scholarships**.\n\n" +
        "Main points:\n" +
        "• Engineering students may check AICTE, state, central, category-based, and special group scholarships.\n" +
        "• Girls, disabled students, SC/ST/OBC/EWS/minority students may have separate schemes.\n" +
        "• Always verify course, income, merit, and institution rules.",

      girls:
        "This guide explains **girl student scholarships**.\n\n" +
        "Main points:\n" +
        "• Girl students can check technical education, state, national, merit, and category-based scholarships.\n" +
        "• AICTE Pragati is a common example for eligible girl students in technical education.\n" +
        "• Check official eligibility and documents before applying.",

      documents:
        "This guide explains **documents needed for scholarships**.\n\n" +
        "Main points:\n" +
        "• Keep Aadhaar, income certificate, marks memo, bank passbook, bonafide, admission proof, and category certificate if applicable.\n" +
        "• Upload clear files.\n" +
        "• Make sure names and details match official records."
    };

    return (
      summaries[guide] ||
      "This guide gives student-friendly scholarship information. Read the headings, note the document checklist, and verify final rules on official portals."
    );
  }

  function getDashboardReply(text) {
    if (containsAny(text, ["save", "bookmark", "apply later"])) {
      return (
        "To save scholarships:\n\n" +
        "1. Open recommendations or scholarship directory.\n" +
        "2. Save the scholarships you like.\n" +
        "3. Use dashboard to view saved scholarships later.\n\n" +
        "Saved scholarships are only for your planning. Apply on official portals."
      );
    }

    if (containsAny(text, ["under review", "status", "applied", "approved", "rejected", "tracker"])) {
      return (
        "Dashboard tracker statuses mean:\n\n" +
        "🟢 Not Applied — you have not applied yet.\n" +
        "🟡 Applied — you submitted the form.\n" +
        "🔵 Under Review — verification may be happening.\n" +
        "✅ Approved — application passed a stage.\n" +
        "❌ Rejected — check reason and correction window.\n\n" +
        "Always confirm final status on the official portal."
      );
    }

    if (containsAny(text, ["recommendation", "recommended", "why this", "match"])) {
      return (
        "Recommendations are based on profile details like:\n\n" +
        "• State\n" +
        "• Course / education\n" +
        "• Category\n" +
        "• Gender\n" +
        "• Annual income\n" +
        "• Percentage / CGPA\n" +
        "• Disability status\n\n" +
        "They are possible matches only, not final approval."
      );
    }

    if (containsAny(text, ["compare", "comparison"])) {
      return (
        "Use comparison to check scholarships side-by-side:\n\n" +
        "• Scholarship name\n" +
        "• Eligibility\n" +
        "• Income limit\n" +
        "• Deadline note\n" +
        "• Official portal\n\n" +
        "This helps you decide which scholarships to apply for first."
      );
    }

    return null;
  }

  function getDirectoryReply(text) {
    if (containsAny(text, ["verify", "official", "source", "real"])) {
      return (
        "To verify a scholarship:\n\n" +
        "1. Open the official source link.\n" +
        "2. Check current notification or guidelines.\n" +
        "3. Confirm eligibility, income limit, deadline, documents, and application process.\n" +
        "4. Do not rely only on simplified summaries."
      );
    }

    if (containsAny(text, ["national", "nsp", "central"])) {
      return findScholarshipMatches(["national", "nsp", "central"], "national scholarships");
    }

    if (containsAny(text, ["ap", "andhra", "jnanabhumi"])) {
      return findScholarshipMatches(["ap", "andhra", "jnanabhumi"], "Andhra Pradesh scholarships");
    }

    if (containsAny(text, ["telangana", "ts", "epass"])) {
      return findScholarshipMatches(["telangana", "ts", "epass"], "Telangana scholarships");
    }

    return null;
  }

  function getGeneralScholarshipReply(text) {
    if (containsAny(text, ["official", "government", "real portal", "applymate official"])) {
      return (
        "No bro. **ApplyMate India is not an official government scholarship portal.**\n\n" +
        "It is a student helper tool. Use it to discover possible scholarships, save options, and track your own progress. Final details must be verified on official portals."
      );
    }

    if (containsAny(text, ["eligibility", "eligible", "match", "finder", "find scholarship"])) {
      return (
        "To check possible eligibility:\n\n" +
        "1. Open the eligibility finder on the homepage.\n" +
        "2. Select state, education level, category/special group, and income range.\n" +
        "3. Add a keyword like engineering, girls, minority, NSP, AP, or Telangana.\n" +
        "4. Click **Find Scholarships**.\n\n" +
        "The result is only a possible match. Always verify final rules officially."
      );
    }

    if (containsAny(text, ["document", "documents", "certificate", "papers"])) {
      return (
        "Common scholarship documents usually include:\n\n" +
        "• Aadhaar card\n" +
        "• Income certificate\n" +
        "• Caste/category/community certificate if applicable\n" +
        "• Disability certificate if applicable\n" +
        "• Previous marks memo\n" +
        "• Bank account details\n" +
        "• Bonafide or institution certificate\n" +
        "• Admission proof"
      );
    }

    if (containsAny(text, ["status", "track", "tracking", "pending", "approved", "rejected", "payment"])) {
      return (
        "To track scholarship status:\n\n" +
        "1. Login to the official scholarship portal.\n" +
        "2. Open application status / track status / student dashboard.\n" +
        "3. Check pending, verified, approved, rejected, or payment status.\n" +
        "4. If pending at institute, contact your college/school scholarship section."
      );
    }

    if (containsAny(text, ["nsp", "otr", "national scholarship portal"])) {
      return (
        "NSP means **National Scholarship Portal**. OTR usually means **One Time Registration**.\n\n" +
        "Keep Aadhaar details, mobile number, email, bank details, institution info, income certificate, category certificate if needed, and marks memo ready."
      );
    }

    if (containsAny(text, ["girl", "girls", "female", "women", "pragati"])) {
      return findScholarshipMatches(["girls", "pragati"], "girls scholarships");
    }

    if (containsAny(text, ["engineering", "technical", "aicte", "diploma", "degree"])) {
      return findScholarshipMatches(["engineering", "technical", "aicte", "diploma", "degree"], "engineering / technical scholarships");
    }

    if (containsAny(text, ["disability", "disabled", "specially abled", "saksham"])) {
      return findScholarshipMatches(["disabled", "disability", "saksham"], "disability scholarships");
    }

    if (containsAny(text, ["minority", "muslim", "christian", "sikh", "buddhist", "jain", "parsi"])) {
      return findScholarshipMatches(["minority"], "minority scholarships");
    }

    if (containsAny(text, ["sc", "scheduled caste"])) {
      return findScholarshipMatches(["sc"], "SC scholarships");
    }

    if (containsAny(text, ["st", "tribal", "scheduled tribe"])) {
      return findScholarshipMatches(["st", "tribal"], "ST scholarships");
    }

    if (containsAny(text, ["obc", "bc", "ebc", "ews", "yasasvi"])) {
      return findScholarshipMatches(["obc", "bc", "ebc", "ews", "yasasvi"], "OBC / BC / EBC / EWS scholarships");
    }

    if (containsAny(text, ["income", "limit", "salary"])) {
      return (
        "Income limits differ by scheme. Common limits may include ₹2 lakh, ₹2.5 lakh, ₹3.5 lakh, ₹4.5 lakh, ₹8 lakh, or other ranges.\n\n" +
        "Use the finder income dropdown, but always verify the latest income limit on the official scheme notification."
      );
    }

    return (
      "I can help with scholarships, eligibility, login, dashboard, documents, NSP OTR, status tracking, guide summaries, girls scholarships, engineering scholarships, AP, Telangana, SC/ST/OBC, minority, disability, and official portal reminders.\n\n" +
      "Try asking: **summarize this guide**, **how to register**, **documents needed**, **how to track status**, or **show engineering scholarships**."
    );
  }

  function findScholarshipMatches(keywords, label) {
    const list = getScholarshipData();

    if (!list.length) {
      return (
        `For ${label}, open the Scholarship Directory or use the eligibility finder.\n\n` +
        "I could not read the scholarship database on this page, but the directory and finder can still help."
      );
    }

    const matches = list
      .filter((item) => {
        const searchable = [
          item.name,
          item.stateLabel,
          item.eligibilityNote,
          item.incomeNote,
          item.sourceName,
          ...(item.tags || []),
          ...(item.categories || []),
          ...(item.education || [])
        ]
          .join(" ")
          .toLowerCase();

        return keywords.some((keyword) => searchable.includes(keyword.toLowerCase()));
      })
      .slice(0, 5);

    if (!matches.length) {
      return (
        `I could not find direct ${label} in the database right now.\n\n` +
        "Try the homepage eligibility finder with a broader keyword or select Any State."
      );
    }

    const names = matches
      .map((item, index) => `${index + 1}. ${item.name}`)
      .join("\n");

    return (
      `Here are possible ${label} from ApplyMate database:\n\n` +
      names +
      "\n\nOpen the eligibility finder or scholarship directory for details and official links."
    );
  }

  function getScholarshipData() {
    try {
      if (Array.isArray(scholarships)) {
        return scholarships;
      }
    } catch (error) {
      return [];
    }

    return [];
  }

  function containsAny(text, words) {
    return words.some((word) => text.includes(word));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createAssistant);
  } else {
    createAssistant();
  }
})();
