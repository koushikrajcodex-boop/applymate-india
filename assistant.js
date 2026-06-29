(function () {
  const QUICK_QUESTIONS = [
    "How to check eligibility?",
    "Documents needed?",
    "How to track status?",
    "Show girls scholarships",
    "Show engineering scholarships",
    "Is ApplyMate official?"
  ];

  function createAssistant() {
    if (document.getElementById("applymateAssistant")) return;

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
          <div class="assistant-title">ApplyMate Assistant</div>
          <div class="assistant-subtitle">Free guide bot • No API key used</div>
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
        This assistant gives general guidance only. Always verify final details on official portals.
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
        botMessage(
          "Hi bro 👋 I can help you understand scholarships, documents, eligibility, status tracking, and saved applications. Ask me something like: engineering scholarships, girls scholarships, documents, NSP, status, or income limit."
        );
      }
    });

    closeBtn.addEventListener("click", () => {
      box.classList.remove("open");
    });

    QUICK_QUESTIONS.forEach((question) => {
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
    }, 350);
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

    if (containsAny(text, ["official", "government", "real portal", "applymate official"])) {
      return (
        "No bro. **ApplyMate India is not an official government scholarship portal.**\n\n" +
        "It is a student helper tool. Use it to discover possible scholarships, save options, and track your own progress. Final eligibility, deadline, income limit, and document rules must be verified on the official portal."
      );
    }

    if (containsAny(text, ["eligibility", "eligible", "match", "finder", "find scholarship"])) {
      return (
        "To check possible eligibility:\n\n" +
        "1. Open the eligibility finder on the homepage.\n" +
        "2. Select state, education level, category/special group, and income range.\n" +
        "3. Add a keyword like engineering, girls, minority, NSP, AP, or Telangana.\n" +
        "4. Click **Find Scholarships**.\n\n" +
        "The result is only a possible match. Always verify final rules on the official portal."
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
        "• Admission proof\n\n" +
        "Exact documents change by scheme, so check the official portal before applying."
      );
    }

    if (containsAny(text, ["status", "track", "tracking", "pending", "approved", "rejected", "payment"])) {
      return (
        "To track scholarship status:\n\n" +
        "1. Login to the official scholarship portal.\n" +
        "2. Open application status / track status / student dashboard.\n" +
        "3. Check if it is pending, verified, approved, rejected, or sent for payment.\n" +
        "4. If it says **Pending at Institute**, contact your school or college scholarship section.\n\n" +
        "You can also use ApplyMate dashboard to track your own application status manually."
      );
    }

    if (containsAny(text, ["nsp", "otr", "national scholarship portal"])) {
      return (
        "NSP means **National Scholarship Portal**. OTR usually means **One Time Registration**.\n\n" +
        "Before NSP OTR, keep Aadhaar details, mobile number, email, bank details, school/college info, income certificate, category certificate if needed, and marks memo ready.\n\n" +
        "ApplyMate has an NSP OTR guide in the Guides section."
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

    if (containsAny(text, ["andhra", "ap", "jnanabhumi"])) {
      return findScholarshipMatches(["andhra", "ap", "jnanabhumi"], "Andhra Pradesh scholarships");
    }

    if (containsAny(text, ["telangana", "ts", "epass"])) {
      return findScholarshipMatches(["telangana", "ts", "epass"], "Telangana scholarships");
    }

    if (containsAny(text, ["income", "limit", "salary"])) {
      return (
        "Income limits are different for each scholarship. Some common ranges in ApplyMate are ₹2 lakh, ₹2.5 lakh, ₹3.5 lakh, ₹4.5 lakh, ₹8 lakh, and above.\n\n" +
        "Use the eligibility finder income dropdown, but always verify the latest income limit on the official scheme notification."
      );
    }

    if (containsAny(text, ["save", "bookmark", "apply later", "dashboard"])) {
      return (
        "To save scholarships:\n\n" +
        "1. Login or register.\n" +
        "2. Use the finder or directory.\n" +
        "3. Save scholarships you want to apply later.\n" +
        "4. Open dashboard to view saved scholarships and update application status.\n\n" +
        "The tracker is personal and does not replace official portal tracking."
      );
    }

    if (containsAny(text, ["mistake", "avoid", "reject", "rejection"])) {
      return (
        "Common mistakes to avoid:\n\n" +
        "• Waiting until the last date\n" +
        "• Wrong name spelling\n" +
        "• Wrong bank details\n" +
        "• Blurry documents\n" +
        "• Wrong scheme selection\n" +
        "• Ignoring institute verification\n" +
        "• Not checking correction window\n\n" +
        "Read the scholarship mistakes guide for the full checklist."
      );
    }

    return (
      "I can help with scholarships, eligibility, documents, NSP OTR, status tracking, girls scholarships, engineering scholarships, AP, Telangana, SC/ST/OBC, minority, disability, and dashboard tracking.\n\n" +
      "Try asking: **show engineering scholarships**, **documents needed**, **how to track status**, or **girls scholarships**."
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
