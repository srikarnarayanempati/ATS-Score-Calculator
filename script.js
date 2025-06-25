const resumeInput = document.getElementById("resumeInput");
const uploadStatusArea = document.getElementById("uploadStatusArea");
const analyzeBtn = document.getElementById("analyzeBtn");

  let uploaded = false;

  resumeInput.addEventListener("change", () => {
    const file = resumeInput.files[0];
    if (!file) return;
    
    uploadStatusArea.innerHTML = "";
    uploaded = false;

    simulateUpload(file.name, Math.random() > 0.5);
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
            <div class="progress-bar ${isSuccess ? 'bg-info' : 'bg-danger'}" id="${id}" style="width: 0%"></div>
          </div>
          <div class="status-text mt-1 small text-muted">${isSuccess ? "Uploading..." : "Upload failed! Please try again."}</div>
        </div>
      </div>
      <div class="text-end">
        ${
          isSuccess
            ? `<div class="fw-semibold" id="${id}-percent">0%</div>`
            : `<a href="#" class="text-primary small retry-link">Try Again <i class="fas fa-redo-alt ms-1"></i></a>`
        }
        <div><i class="fas fa-trash-alt text-danger mt-2 cursor-pointer remove-btn" style="cursor: pointer;"></i></div>
      </div>
    `;

    uploadStatusArea.appendChild(card);

    if (isSuccess) {
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
    } else {
      const retryLink = card.querySelector(".retry-link");
      retryLink.addEventListener("click", (e) => {
        e.preventDefault();
        card.remove();
        simulateUpload(filename, true);
      });
    }

    const removeBtn = card.querySelector(".remove-btn");
    removeBtn.addEventListener("click", () => {
      card.remove();
      analyzeBtn.classList.add("d-none");
      document.getElementById("analysisResult").classList.add("d-none");
      uploaded = false;
    });
  }

  
  analyzeBtn.addEventListener("click", () => {
    if (!uploaded) return;

  
    const file = resumeInput.files[0];
    const fileReader = new FileReader();

    fileReader.onload = async function (e) {
      const fileContent = e.target.result;

      let text = "";
      if (file.type === "application/pdf") {
        text = await extractTextFromPDF(fileContent);
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        text = await extractTextFromDOCX(fileContent);
      }

      const scores = calculateScores(text);
      displayScores(scores);
    };

    fileReader.readAsArrayBuffer(file);
  });

  
  async function extractTextFromPDF(pdfData) {
    const pdf = await pdfjsLib.getDocument(pdfData).promise;
    let text = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      content.items.forEach(item => {
        text += item.str + " ";
      });
    }
    return text;
  }

  
  async function extractTextFromDOCX(docxData) {
    const result = await mammoth.extractRawText({ arrayBuffer: docxData });
    return result.value;
  }

  
  function calculateScores(text) {
    const atsScore = calculateATSScore(text);
    const layoutScore = calculateLayoutScore(text);
    const impactScore = calculateImpactScore(text);
    const crispnessScore = calculateCrispnessScore(text);

    return { atsScore, layoutScore, impactScore, crispnessScore };
  }

  function calculateATSScore(text) {
    const requiredSections = ["summary", "experience", "skills", "education"];
    let score = 0;
    requiredSections.forEach(section => {
      if (text.toLowerCase().includes(section)) {
        score += 25;
      }
    });
    return Math.min(100, score);
  }

  function calculateLayoutScore(text) {
    
    const headings = ["experience", "education", "skills"];
    let score = 0;
    headings.forEach(heading => {
      if (text.toLowerCase().includes(heading)) {
        score += 33;
      }
    });
    return Math.min(100, score);
  }

  function calculateImpactScore(text) {
    const actionVerbs = ["led", "developed", "built", "achieved", "improved"];
    let score = 0;
    actionVerbs.forEach(verb => {
      if (text.toLowerCase().includes(verb)) {
        score += 20;
      }
    });
    return Math.min(100, score);
  }

  function calculateCrispnessScore(text) {
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]/).length;

    let score = 100;
    if (wordCount > 500 || sentenceCount > 20) {
      score -= 20;
    }
    return Math.max(50, score);
  }

  function displayScores(scores) {
    
    document.getElementById("atsScore").innerText = scores.atsScore;
    document.getElementById("layoutScore").innerText = scores.layoutScore;
    document.getElementById("impactScore").innerText = scores.impactScore;
    document.getElementById("crispScore").innerText = scores.crispnessScore;

    
    document.getElementById("analysisResult").classList.remove("d-none");

    const analysisSection = document.getElementById("analysisResult");
  analysisSection.scrollIntoView({
    behavior: "smooth",
    block: "start"      
  });
  }
