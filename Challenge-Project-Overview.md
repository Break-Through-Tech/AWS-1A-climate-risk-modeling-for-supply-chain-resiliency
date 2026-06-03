---

> ## Challenge Advisor: Update & Finalize Your Project Overview
>
> > 💡 **These grey text instructions are just for you, the team's Challenge Advisor; please delete them once you have completed the steps below.**
>
> We've pre-populated this Challenge Project Overview page — which is what will be shared with your Break Through Tech student team in August — using the details from your submission form. You should have received an email inviting you to join this repo as a Collaborator, enabling you to add files and make edits.
> 
> In order for your project to be finalized and assigned to a team, please:
> 1. **Review all sections below** and update or expand any content as needed, making sure to address the SME Feedback in the section immediately below. Look for square brackets to find the places below that require additional inputs from you (e.g., "About [Company / Org Name]").
> 2. **Add your dataset** to the [data folder](data) in this repo.
> 3. **Close the Issue assigned to you in this repo** to let us know that you have made your edits and the overview page is ready for final review. You can do this by going to the _Issues_ tab in the top left section of the menu above, add a comment that says "CA review complete", and click the button to Close the Issue. 
>
> If you're unfamiliar with how to edit a page like this in GitHub, check out [this tutorial](https://ubc-lib-geo.github.io/gis-workshop-waml-template/content/handson/edit-readme.html) for a quick overview (start with step 2 and only edit this page), and [this guide](https://ubc-lib-geo.github.io/gis-workshop-waml-template/content/markdown.html) on how to use Markdown to compose text.
>
>
> ❌ Remember that this is a public repo. Do NOT include: Proprietary data, PII, API keys, credentials, or anything confidential.

---

## 📋 BTT Internal Evaluation Notes
*(This section is for BTT staff only — remove before sharing with students)*

| Check | Status | Notes |
|-------|--------|-------|
| Python Compatibility | 🟢 | The tech stack is Python-centered, including PyTorch and Streamlit for model building and user interfaces, respectively. |
| Data Readiness | 🟢 | Data is sourced from a UCI repository and estimated to be under 1GB, indicating that it's likely ready for immediate use with minimal cleaning required. |
| Resource Check | 🟢 | The project employs free-tier tools such as Google Colab, making hardware requirements accessible to students without specialized privileges. |

**Student Fit Score:** 8/10  
**Technical Depth Score:** 7/10  
**Overall Recommendation:** REVISE

**Advisor Feedback Draft:**
This project presents a solid opportunity to engage students in a high-impact, real-world application of ML techniques within climate science. However, students may need guidance on best practices for time-series analysis and model evaluation metrics to ensure they derive actionable insights from the model. It would benefit from a clearer definition of the deliverable components to guide student efforts more effectively. Please clarify the scope of the technical scoping document and the criteria for 'professional handoff.'

---

---

# Climate Risk Modeling for Supply Chain Resiliency

**Company / Org:** Amazon Web Services  
**Challenge Advisor:** Megan McKenzie, megankaymckenzie@gmail.com  
**Program:** Break Through Tech AI Studio - Fall 2026

---

## 🏢 About Amazon Web Services

Amazon Web Services (AWS) provides cloud computing services to businesses and organizations globally, enabling them to innovate and scale applications quickly and efficiently. Our department focuses on solutions that leverage data analytics and machine learning to enhance operational insights and decision-making.

---

## 🎯 The Challenge

### Project Summary
In this project, you will use spatial-temporal oceanographic and atmospheric tabular data, as well as advanced machine learning techniques (such as Gradient Boosted Trees and time-series feature engineering) to build a predictive risk model that forecasts Sea Surface Temperature Anomalies (SSTAs) and classifies climate risk thresholds months in advance. This will help our organization address the severe supply chain disruptions, logistics delays, and infrastructure vulnerabilities caused by global climate events like the El Niño-Southern Oscillation (ENSO).

### Success Criteria
Pipeline completeness (modular pipeline for ingestion/cleaning), predictive performance (Macro F1-Score), model interpretability (SHAP/feature importance), and professional handoff.

### Project Milestones

Use these milestones to guide your work. Your team will create a **GitHub Projects board** to track tasks within each milestone.

| Month | Milestone | Key Activities |
|-------|-----------|----------------|
| **September** | Data Understanding | Explore dataset, handle missing values, document findings |
| **October** | Model Development | Train baseline model, experiment with approaches, iterate |
| **November** | Evaluation & Presentation | Finalize model, prepare presentation, document results |

> **Note for the team:** Please create a GitHub Projects board in this repository to break these milestones into weekly tasks. Go to the **Projects** tab → **New project** → Choose **Board** → Add columns for each month.

---

## 📊 Dataset

**Name and Source:** Spatial-temporal oceanographic and atmospheric tabular data from the UCI El Niño repository  
**Format:** CSV  
**Size:** under 1gb  
**Location:** [https://archive.ics.uci.edu/dataset/122/el+nino](https://archive.ics.uci.edu/dataset/122/el+nino)

### Key Details
- Spatial-temporal oceanographic and atmospheric tabular data (Numerical, Categorical, Time Series) sourced from the UCI El Niño repository.
- Minimal preprocessing is needed as the data is well-structured.
- [Link to data dictionary or documentation, if available]

---

## 🛠️ Suggested Approach

**ML Problem Type:** Classification and Regression

**Recommended Libraries:**
- Gradient Boosted Trees
- time-series feature engineering
- PyTorch (LSTMs)
- Streamlit
- Gradio

**Evaluation Metrics:**
- Macro F1-Score, model interpretability (SHAP/feature importance)

---

## 📚 Resources to Get Started

The following resources will help your team understand the problem space and potential technical approaches for this project:

**Background Reading:**
- [Understanding Climate Change and El Niño](https://www.climate.gov/news-features/understanding-climate/what-el-nio)
- [Recent Trends in Climate Data Analysis](https://www.ipcc.ch/report/ar6/wg1/)

**Technical Tutorials:**
- [Time Series Forecasting with Python](https://towardsdatascience.com/time-series-forecasting-with-python-e5b068d2929a)
- [Introduction to SHAP for Model Interpretability](https://towardsdatascience.com/introduction-to-shap-the-lower-intelligence-scaling-army-678a0c49ac9e)

**Code Examples:**
- [Climate Risk Modeling Code Implementation](https://github.com/example/climate-risk-model)
- [Sample LSTM Implementation](https://github.com/example/lstm-time-series-prediction)

**Other:**
- [Research Papers on Climate Modeling](https://www.sciencedirect.com/topics/earth-and-planetary-sciences/climate-modeling)

*Feel free to explore beyond these, and share anything interesting you find with me!*

---

## 🤝 How We'll Work Together

**Check-ins:** During our biweekly 60-min AI Studio Lab Section meeting block (2nd and 4th week of every month)  
**Communication:** Slack (Break Through Tech workspace)  
**Response time:** Within 48 hours on weekdays  

**Recommended Tools:**
- **Coding:** Google Colab, VS Code
- **Collaboration:** GitHub, Notion
- **Virtual Meetings:** Zoom, Google Meet

---

## 🚀 Getting Started

1. **Review this overview document** and note any questions for our first meeting
2. **Begin reviewing the dataset** using the link above
3. **Read the GitHub Projects documentation** [here](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects)

I'm excited to work with you!

---

## ❓ Questions?

Please bring any questions to our first meeting during the week of August 24th (Break Through Tech's Bridge to Studio - Session B).


---
