function displayScores(scores) {
  document.getElementById("atsScore").innerText = scores.atsScore;
  document.getElementById("layoutScore").innerText = scores.layoutScore;
  document.getElementById("impactScore").innerText = scores.impactScore;
  document.getElementById("crispScore").innerText = scores.crispnessScore;

  const analysisSection = document.getElementById("analysisResult");
  analysisSection.classList.remove("d-none");
  analysisSection.scrollIntoView({ behavior: "smooth", block: "start" });
}


let uploaded = false;
let fileToAnalyze = null;

resumeInput.addEventListener("change", () => {
  const file = resumeInput.files[0];
  if (!file) return;

  uploadStatusArea.innerHTML = "";
  uploaded = false;
  fileToAnalyze = file;

  simulateUpload(file.name, true);

    if (window.innerWidth <= 768) {
    setTimeout(() => {
      uploadStatusArea.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 300);
  }
});

function simulateUpload(filename, isSuccess) {
  const card = document.createElement("div");
  card.className = "upload-card d-flex justify-content-between align-items-start position-relative";

  const id = `progress-${Date.now()}`;

  card.innerHTML = `
    <div class="d-flex align-items-start">
      <i class="fas fa-file-alt upload-icon mt-1"></i>
      <div>
        <div class="fw-semibold">${filename}</div>
        <div class="progress mt-2 w-100">
          <div class="progress-bar bg-info" id="${id}" style="width: 0%"></div>
        </div>
        <div class="status-text mt-1 small text-muted">Uploading...</div>
      </div>
    </div>
    <div class="text-end">
      <div class="fw-semibold" id="${id}-percent">0%</div>
      <div><i class="fas fa-trash-alt text-danger mt-2 cursor-pointer remove-btn" style="cursor: pointer;"></i></div>
    </div>
  `;

  uploadStatusArea.appendChild(card);

  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    document.getElementById(id).style.width = `${progress}%`;
    document.getElementById(`${id}-percent`).innerText = `${progress}%`;

    if (progress >= 100) {
      clearInterval(interval);
      document.getElementById(id).classList.remove("bg-info");
      document.getElementById(id).classList.add("bg-success");
      document.getElementById(`${id}-percent`).innerHTML = `<i class="fas fa-check-circle text-success ms-1"></i>`;
      card.querySelector(".status-text").innerText = "Upload Successful!";
      uploaded = true;
      analyzeBtn.classList.remove("d-none");
    }
  }, 200);

  const removeBtn = card.querySelector(".remove-btn");
  removeBtn.addEventListener("click", () => {
    card.remove();
    analyzeBtn.classList.add("d-none");
    document.getElementById("analysisResult").classList.add("d-none");
    uploaded = false;
    fileToAnalyze = null;
  });
}

analyzeBtn.addEventListener("click", () => {
  if (!uploaded || !fileToAnalyze) return;

  document.getElementById("loadingSpinner").classList.remove("d-none");

  const formData = new FormData();
  formData.append("file", fileToAnalyze);

  fetch("https://api.affinda.com/v2/resumes", {
    method: "POST",
    headers: {
      "Authorization": "Bearer aff_310d528d60dc9727e140a78b4c311a75bfccfdfc"
    },
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      const parsed = data.data;
      const scores = calculateScoresFromAffinda(parsed);
      displayScores(scores);
    })
    .catch(err => {
      console.error("Affinda API error:", err);
      alert("Failed to analyze resume. Please try again.");
    })
    .finally(() => {
      document.getElementById("loadingSpinner").classList.add("d-none");
    });
});


function calculateScoresFromAffinda(parsed) {
  const requiredSections = ["experience", "education", "skills", "summary"];
  let atsScore = 0;

  requiredSections.forEach(section => {
    const found = parsed.sections?.some(sec =>
      sec.sectionType?.toLowerCase().includes(section)
    );
    if (found) atsScore += 20;
  });

  if (parsed.contactInformation?.email && parsed.contactInformation?.phone) {
    atsScore += 10;
  }

  if (parsed.languages?.length > 0) {
    atsScore += 5;
  }

  if (parsed.certifications?.length > 0) {
    atsScore += 5;
  }

  atsScore = Math.min(100, atsScore);

  let layoutScore = 100;
  if (!parsed.name) layoutScore -= 20;
  if (!parsed.contactInformation?.email) layoutScore -= 15;
  if (!parsed.contactInformation?.phone) layoutScore -= 15;
  if (!parsed.skills || parsed.skills.length < 3) layoutScore -= 15;

  const sectionOrder = parsed.sections?.map(s => s.sectionType?.toLowerCase()) || [];
  const correctOrder = ["summary", "experience", "education", "skills"];
  let disorderPenalty = 0;

  correctOrder.forEach((section, index) => {
    if (sectionOrder.indexOf(section) !== index && sectionOrder.includes(section)) {
      disorderPenalty += 5;
    }
  });

  layoutScore -= disorderPenalty;
  layoutScore = Math.max(40, layoutScore);

  const impactVerbs = [
    "led", "created", "built", "improved", "developed", "managed",
    "optimized", "designed", "launched", "achieved", "reduced", "increased"
  ];

  const experienceText = parsed.sections
    ?.filter(s => s.sectionType?.toLowerCase() === "experience")
    .map(s => s.text || "")
    .join(" ")
    .toLowerCase();

  let verbMatches = 0;
  impactVerbs.forEach(v => {
    if (experienceText.includes(v)) verbMatches++;
  });

  let impactScore = 40 + Math.min(verbMatches * 5, 60); // Max 100
  if (verbMatches < 2) impactScore -= 10;

  const combinedText = [
    parsed.professionalSummary,
    parsed.objective,
    experienceText
  ].join(" ");

  const wordCount = combinedText.split(/\s+/).length;
  const sentenceCount = combinedText.split(/[.!?]/).length;

  let crispnessScore = 100;

  if (wordCount > 800) crispnessScore -= 25;
  if (sentenceCount > 60) crispnessScore -= 15;
  if (wordCount < 120) crispnessScore -= 20;
  if (sentenceCount < 10) crispnessScore -= 15;

  crispnessScore = Math.max(40, crispnessScore);

  return {
    atsScore,
    layoutScore,
    impactScore,
    crispnessScore
  };
}
