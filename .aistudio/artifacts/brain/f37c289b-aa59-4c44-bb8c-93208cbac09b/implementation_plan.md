# Implementation Plan - University Clinic-Schools & Student Support Program (4th Via)

This plan outlines the integration of the **Faculdades & Clínicas-Escola** (4th Via) ecosystem into the platform, addressing continuity of care post-clinic-school, university student mental health (NAE/NAP), and the therapeutic tripod for psychology/therapy trainees ("Cuidar de Quem Vai Cuidar").

## Proposed Architecture & Features

### 1. Home & Navigation Integration ("4th Via")
- Add a 4th prominent card on the Home view: **Faculdades & Clínicas-Escola** (Subtitle: "Continuidade pós-estágio para pacientes e convênio para universitários").
- Expand the Home layout grid from 3 cards to 4 balanced cards (responsive 4-col desktop, 2x2 tablet/mobile).
- Navigation link to the dedicated institutional partner landing page.

### 2. Student & Clinic-School Intake Flow (`/acolhimento` or dedicated tab)
- Add a 3rd selection option in the intake selector: **Estudante & Clínica-Escola** ("Programa Universitário e Continuidade"), alongside *Particular* and *Corporativo*.
- **Student & Clinic-School Landing Page / Form**:
  - **Main Block (University Life & Continuity)**: For all undergraduate/postgraduate students (academic stress, thesis, exams, student budget), plus dedicated messaging for patients finishing their 6-month cycle or entering recess at university clinic-schools (SPAs).
  - **Tripé Formativo Appendix ("Cuidar de Quem Vai Cuidar")**: Section for psychology, psychoanalysis, and therapy trainees (personal therapy requirements, supervised internship support, theoretical orientation preference tag: Psychoanalysis, CBT, Phenomenology, Humanist, etc.).
  - **Smart Intake Tagging**: Automatically tags incoming intakes as `Estudante Universitário`, `Estudante de Psicologia / Formação`, or `Continuidade Clínica-Escola` (with institution name if applicable).

### 3. Institutional Partnership Landing Page ("Faculdades & Clínicas-Escola")
- **Hero Section**: "O semestre letivo termina, mas o cuidado clínico não pode parar." (Ethical transition and affordable student network).
- **3 Pillars**:
  1. Continuidade Pós-Clínica-Escola (6 months / recess transition).
  2. Absorção de Fila de Espera & Apoio ao NAE/NAP (fast response for university support centers).
  3. Programa do Tripé Formativo para Alunos (social student rates & personal therapy for health students).
- **Ethical Flow (CFP + LGPD)**: 3-step explanation of the institutional partnership.
- **Institutional Contact & Credentialing Form**: Captures Institution Name, Department (SPA, Course Coordination, NAE, Student Union/Athletic, Training Institute), Contact Name, Role, Email, WhatsApp, and Partnership Type. Saves directly to Firestore for management review.

### 4. Management Dashboard (`/gestao`)
- Add a dedicated **Parcerias Acadêmicas / Institucionais** tab to review, filter, and manage institutional leads submitted by universities and clinic-schools.
- Enhanced filtering in patient management to view incoming intakes by academic/clinic-school tags and theoretical approach preference.

## User Review & Next Steps
Upon approving this plan, we will execute the implementation across the frontend components and Firestore schema updates.
