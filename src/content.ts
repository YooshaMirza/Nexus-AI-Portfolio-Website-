/**
 * content.ts — single source of truth.
 * Everything the page renders AND everything Nexus knows comes from here,
 * so the site and the voice agent can never disagree.
 * Every item has a stable `id`; the page tags its element with it and
 * Nexus receives it as "what the visitor is looking at".
 */

export const person = {
  name: 'Mirza Yoosha Minhaj',
  short: 'Yoosha',
  role: 'AI Forward Deployed Engineer at Weya.ai',
  summary:
    'AI engineer who builds production voice agents, real-time LLM pipelines, computer vision systems and agentic AI with MCP.',
  email: 'yoosha786@gmail.com',
  phone: '+91 95281 14494',
  whatsapp: 'https://wa.me/919528114494?text=Hi%20Yoosha%2C%20I%20found%20your%20portfolio%20and%20would%20like%20to%20talk.',
  cv: 'https://drive.google.com/file/d/1IFCMOFeQoFp-hV0YyvUmcdTVnWyfnwzS/view?usp=sharing',
  upwork: 'https://www.upwork.com/freelancers/~01f371feafd31d5190',
  links: [
    { label: 'Upwork', href: 'https://www.upwork.com/freelancers/~01f371feafd31d5190' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/the-mirza-yoosha' },
    { label: 'GitHub', href: 'https://github.com/YooshaMirza' },
    { label: 'YouTube', href: 'https://www.youtube.com/@yooshamirza' },
  ],
};

export type Stage = { title: string; type: string; when: string; months: number; note?: string };
export type Job = {
  id: string; role: string; org: string; when: string; current?: boolean; text: string; tags: string[];
  /** Full-time, Internship, or a path like Intern → Full-time */
  type: string;
  /** company logo in /public/logos (checked by Yoosha) */
  logo?: string;
  /** the logo is a wide wordmark (shown in a rounded rectangle, not a circle) */
  logoWide?: boolean;
  /** 2-4 concrete bullet points */
  highlights?: string[];
  /** steps inside one company, e.g. internship converted to full-time */
  stages?: Stage[];
  /** one plain sentence explaining the stages */
  progression?: string;
};

export const jobs: Job[] = [
  {
    id: 'job-weya',
    role: 'AI Forward Deployed Engineer',
    org: 'Weya.ai',
    logo: '/logos/weya.png',
    when: 'Sep 2026 – now',
    current: true,
    type: 'Full-time',
    text: 'Half engineer, half client partner. He works with client teams to take requirements, then builds their voice agents end to end: the AI side (prompts, conversation flows, tool calls, validations) plus the code around it, front end, back end and deployment, until the agent is live on real inbound and outbound calls.',
    highlights: ['Architects low-latency, end-to-end voice agents on enterprise speech AI infrastructure.', 'Connects LLMs to real systems with MCP, so speech-to-speech agents call external tools live, mid-call.', 'Designs real-time, context-aware pipelines from caller audio to generated replies, built for production scale.'],
    tags: ['Voice agents', 'Client-facing', 'MCP', 'Tool calling', 'Full-stack', 'Deployment'],
  },
  {
    id: 'job-neurabit',
    role: 'AI Engineer',
    org: 'Neurabit Solutions',
    logo: '/logos/neurabit.png',
    when: 'Nov 2025 – Sep 2026',
    type: 'Intern → Full-time',
    progression: 'Joined as an intern in Nov 2025 and was converted to a full-time AI Engineer in May 2026.',
    stages: [
      { title: 'AI Engineer Intern', type: 'Internship', when: 'Nov 2025 – Apr 2026', months: 6 },
      { title: 'AI Engineer', type: 'Full-time', when: 'May – Sep 2026', months: 5, note: 'Converted to full-time' },
    ],
    text: 'Architected InstaBus, a production voice agent platform for intercity bus operators, and owned its orchestration layer end to end.',
    highlights: ['Telephony: inbound and outbound calling, SIP/VoIP trunking, concurrent call routing, and live call recording with storage sync.', 'Speech: real-time STT and TTS tuned for sub-second latency, with custom signal processing for noise cancellation and echo reduction.', 'Grounded answers: turned large, deeply nested JSON knowledge into lightweight context so agents don\'t hallucinate on live calls or chat.', 'Agentic workflows with MCP, plus medical computer vision: wound segmentation and surface-area estimation with OpenCV, TensorFlow and PyTorch.'],
    tags: ['Telephony', 'SIP/VoIP', 'STT/TTS', 'RAG', 'MCP', 'Computer vision'],
  },
  {
    id: 'job-sarvm',
    role: 'AI / ML Intern',
    org: 'Sarvm.ai',
    logo: '/logos/sarvm.png',
    type: 'Internship',
    when: 'Dec 2024 – Jan 2025',
    text: 'Fine-tuned open-weight LLMs for low-resource Indian languages and built retrieval pipelines around them.',
    highlights: ['Hyperparameter tuning and optimisation of open-weight LLMs for accurate understanding in low-resource languages.', 'Vector-database RAG pipelines for secure, high-throughput retrieval across large document collections.'],
    tags: ['LLM fine-tuning', 'Multilingual NLP', 'RAG', 'Vector DBs'],
  },
  {
    id: 'job-sync',
    role: 'Web Development Intern',
    org: 'Syinq (formerly Sync)',
    logo: '/logos/syinq.png',
    when: 'Dec 2024',
    type: 'Internship',
    text: 'Developed high-performance web applications with modern front-end technologies.',
    tags: ['React', 'Front end'],
  },
  {
    id: 'job-iit',
    role: 'Machine Learning Research Intern',
    org: 'DRISHTI CPS Foundation, IIT Indore',
    logo: '/logos/drishti.png',
    type: 'Internship',
    when: 'Jun – Aug 2024',
    text: 'Researched and evaluated deep learning architectures, from sequence models to generative AI.',
    highlights: ['Built an LSTM time-series classifier on NIFTY 50 data with technical-indicator features and Optuna tuning.', 'Designed and compared CNN, LSTM and Transformer architectures; prototyped GANs and diffusion models for generation and reconstruction.'],
    tags: ['LSTM', 'Transformers', 'GANs & diffusion', 'Optuna'],
  },
  {
    id: 'job-bit',
    role: 'Deep Learning Research Intern',
    org: 'BIT Sindri',
    logo: '/logos/bit-sindri.png',
    type: 'Internship',
    when: 'Jun – Jul 2024',
    text: 'Built end-to-end ML code for real-time anomaly detection in wire-arc additive manufacturing (WAAM).',
    highlights: ['Full data pipeline: raw data engineering, cleaning, feature transformation and validation splits.', 'Custom autoencoders with sequence-to-sequence layers to model high-dimensional variation and flag anomalies.'],
    tags: ['Autoencoders', 'Seq2seq', 'Anomaly detection', 'Data pipelines'],
  },
  {
    id: 'job-octanet',
    role: 'Web Development Intern',
    org: 'Octanet Services',
    logo: '/logos/octanet.png',
    when: 'Dec 2023 – Jan 2024',
    type: 'Internship',
    text: 'Created interactive landing pages that improved UX and UI.',
    tags: ['HTML/CSS/JS', 'UI'],
  },
  {
    id: 'job-dabotics',
    role: 'Python Developer Intern',
    org: 'Dabotics India',
    logo: '/logos/dabotics.png',
    when: 'Dec 2023 – Jan 2024',
    type: 'Internship',
    text: 'Built an OTP verification system and a URL shortener in Python.',
    tags: ['Python'],
  },
  {
    id: 'job-internshala',
    role: 'Internshala Student Partner',
    org: 'Internshala',
    logo: '/logos/internshala.png',
    logoWide: true,
    when: 'Sep – Nov 2022',
    type: 'Internship',
    text: "Remote student partner for Internshala: brought its internships and trainings to students, working on outreach and marketing.",
    tags: ['Cross-cultural communication', 'Marketing strategy'],
  },
  {
    id: 'job-cloudbird',
    role: 'Subject Matter Expert (Mathematics) & QA Intern',
    org: 'Cloudbird Digital, Noida',
    logo: '/logos/cloudbird.png',
    logoWide: true,
    when: 'May – Aug 2022',
    type: 'Internship',
    text: 'Wrote step-by-step solutions to mathematics questions and quality-checked them, to a daily target of 25 questions.',
    tags: ['Mathematics', 'Quality assurance'],
  },
];

export type Project = {
  id: string;
  title: string;
  kind: string;
  text: string;
  detail?: string;
  stack: string[];
  links?: { label: string; href: string }[];
  /** live product / demo site, shown as a "Show demo" button */
  demo?: string;
  /** company work: no code links are shown */
  company?: boolean;
  featured?: boolean;
  /** which expertise area it proves (drives the cover art and the filters) */
  area: Area;
  /** headline number shown on the card */
  metric?: { value: string; label: string };
};

export type Area = 'voice' | 'llm' | 'vision' | 'ml' | 'web';
export const areaLabels: Record<Area, string> = { voice: 'Voice agents', llm: 'LLMs & agents', vision: 'Vision', ml: 'Forecasting & ML', web: 'Web & systems' };

const gh = (repo: string) => `https://github.com/YooshaMirza/${repo}`;

export const projects: Project[] = [
  {
    id: 'proj-instabus',
    area: 'voice',
    title: 'InstaBus voice platform',
    kind: 'Production, Neurabit',
    text: 'Phone agents that book seats, reschedule trips and answer route questions for intercity bus operators.',
    detail: 'Inbound and outbound calling, call orchestration, recording and transcription, with real-time speech models tuned for low latency and noisy lines.',
    stack: ['Telephony', 'STT/TTS', 'LLMs', 'FastAPI'],
    company: true,
    demo: 'https://www.instabus.co.in/',
    featured: true,
  },
  {
    id: 'proj-nexus',
    area: 'voice',
    title: 'Nexus, this voice agent',
    kind: 'Personal',
    text: 'The agent talking to you right now. It follows what you scroll to and can move the page for you.',
    detail: 'Gemini Live speech-to-speech over short-lived tokens, a WebGL voice visual driven by live audio, and page context streamed into the conversation. It grew out of his earlier 3D voice bot with RAG.',
    stack: ['Gemini Live', 'Three.js', 'React', 'Netlify Functions'],
    links: [{ label: 'Earlier 3D voice bot', href: 'https://chatbot-murex-eta-24.vercel.app/' }, { label: 'Code', href: gh('3D-Voice-Bot-with-RAG-and-LLM') }],
    featured: true,
  },
  {
    id: 'proj-docusense',
    area: 'voice',
    title: 'DocuSense RAG voice agent',
    kind: 'Internship project, Endee',
    text: 'A real-time voice concierge on Gemini Live that searches an uploaded knowledge base mid-call instead of stuffing it into the prompt.',
    detail: 'Documents are chunked and embedded locally (MiniLM, 384-d) into the Endee vector database; during the call the agent uses a search_knowledge_base tool through a FastAPI backend, so answers stay fast and grounded.',
    stack: ['Gemini Live', 'Endee vector DB', 'FastAPI', 'React'],
    links: [{ label: 'Code', href: gh('Voice-Agent-with-Endee-Vector-DB') }],
    featured: true,
  },
  {
    id: 'proj-dental',
    area: 'voice',
    title: 'Dental clinic voice receptionist',
    kind: 'Company project',
    text: 'An inbound and outbound phone receptionist for a dental clinic that books and updates appointments through a booking API.',
    stack: ['Python', 'FastAPI', 'Telephony', 'Tool calling'],
    company: true,
  },
  {
    id: 'proj-mcp',
    area: 'llm',
    title: 'Pokémon Arena MCP server',
    kind: 'Personal',
    text: 'An MCP server that gives Claude Desktop tools to look up Pokémon and run battles over the PokéAPI.',
    detail: 'Also ships a web arena where you pick two Pokémon and Gemini simulates the battle.',
    stack: ['TypeScript', 'Node', 'MCP', 'Gemini'],
    links: [{ label: 'Live demo', href: 'https://ai-pokemon-arena-mcp-server.vercel.app/' }, { label: 'Code', href: gh('AI-Pokemon-Arena--MCP-Server') }],
    featured: true,
  },
  {
    id: 'proj-medisum',
    area: 'llm',
    title: 'MediSum',
    kind: 'Personal',
    text: 'A medicine information chatbot: it checks a local medicine database first for composition, uses and side effects, then falls back to Gemini.',
    stack: ['Python', 'Streamlit', 'Gemini', 'Hybrid search'],
    links: [{ label: 'Live demo', href: 'https://llmchatbot-dtlt9bfmcqup4kqek6yzfo.streamlit.app/' }, { label: 'Code', href: gh('llm_chatbot') }],
    featured: true,
  },
  {
    id: 'proj-skin',
    area: 'vision',
    metric: { value: '96.64%', label: 'accuracy, 57 classes' },
    title: 'Skin disease and cancer classifier',
    kind: 'Research',
    text: 'A custom CNN that classifies 57 skin conditions at 96.64% accuracy, published in IEEE Xplore.',
    stack: ['TensorFlow', 'CNN', 'Medical imaging'],
    links: [{ label: 'Live demo', href: 'https://delhi-care.vercel.app/' }, { label: 'Code', href: gh('Deep-Learning-Skin-disease-and-skin-cancer-predition-model-using-CNN') }],
    featured: true,
  },
  {
    id: 'proj-crypto',
    area: 'ml',
    metric: { value: '85%', label: 'directional accuracy' },
    title: 'Crypto price prediction',
    kind: 'Personal',
    text: 'LSTM and XGBoost models with technical indicators, reaching 85% directional accuracy.',
    stack: ['LSTM', 'XGBoost', 'Python'],
    links: [{ label: 'Code', href: gh('CRYPTO-PRICE-PREDICTION-MODEL') }],
    featured: true,
  },
  {
    id: 'proj-aqi',
    area: 'ml',
    title: 'AQI forecast website',
    kind: 'Personal',
    text: 'Air-quality forecasting with predictive models and live environmental data.',
    stack: ['Python', 'Forecasting'],
    links: [{ label: 'Live demo', href: 'https://aqi-forecast-website.onrender.com/' }, { label: 'Code', href: gh('AQI-forecast-website') }],
  },
  {
    id: 'proj-brain',
    area: 'vision',
    metric: { value: '97.1%', label: 'accuracy, 4 MRI classes' },
    title: 'Brain tumour detection',
    kind: 'Research',
    text: 'Custom CNN classifying four MRI classes at 97.1% accuracy.',
    stack: ['CNN', 'MRI'],
    links: [{ label: 'Code', href: gh('Brain-tumor-Detection') }],
  },
  {
    id: 'proj-t2v',
    area: 'llm',
    title: 'Text to image and video generation',
    kind: 'Personal',
    text: 'Experiments generating images and short videos from text prompts.',
    stack: ['Diffusion models'],
    links: [{ label: 'Code', href: gh('Text-to-Image-Video-Generation-Model') }],
  },
  {
    id: 'proj-campus',
    area: 'web',
    title: 'Campus Cravings',
    kind: 'Web',
    text: 'Food ordering for campus dining with live order tracking.',
    stack: ['Firebase', 'HTML/CSS/JS'],
    links: [{ label: 'Live demo', href: 'https://yooshamirza.github.io/campus-cravings/' }, { label: 'Code', href: gh('campus-cravings') }],
  },
  {
    id: 'proj-alumni',
    area: 'web',
    title: 'Alumni Connect portal',
    kind: 'Web',
    text: 'A networking platform that connects graduates with current students.',
    stack: ['TypeScript', 'React'],
    links: [{ label: 'Live demo', href: 'https://alumniconnectproject.netlify.app/' }, { label: 'Code', href: gh('Alumni-Connect-Portal-') }],
  },
  {
    id: 'proj-proxy',
    area: 'web',
    title: 'Anti-proxy attendance',
    kind: 'Systems',
    text: 'Attendance system with verification checks that stop proxy attendance.',
    stack: ['Python'],
    links: [{ label: 'Code', href: gh('ANTI-PROXY-PROJECT') }],
  },
  {
    id: 'proj-fireguard',
    area: 'web',
    title: 'FireGuard firewall manager',
    kind: 'Systems',
    text: 'Firewall management with real-time threat detection and automated responses.',
    stack: ['Python', 'Security'],
    links: [{ label: 'Code', href: gh('FireGuard-Advanced-Firewall-Management-System') }],
  },
  {
    id: 'proj-dsa',
    area: 'web',
    title: 'DSA code visualiser',
    kind: 'Education',
    text: 'Step-by-step visual execution of data structures and algorithms.',
    stack: ['Python'],
    links: [{ label: 'Code', href: gh('DSA-CODE-VISUALIZER') }],
  },
  {
    id: 'proj-sat',
    area: 'vision',
    title: 'Satellite image segmentation',
    kind: 'Research',
    text: 'Land-cover segmentation of satellite imagery with Google Earth Engine.',
    stack: ['Earth Engine', 'Segmentation'],
    links: [{ label: 'Code', href: gh('segmentation-of-satellite-image-using-google-search-engine') }],
  },
];

export type Paper = { id: string; figure: string; figureLabel: string; title: string; venue: string; text: string; href?: string; status: string; classes: number; classNames?: string[]; model: string; date?: string; abstract: string[]; baselines: string[]; methods: string[] };

export const papers: Paper[] = [
  {
    id: 'paper-skin',
    figure: '96.64%',
    figureLabel: 'accuracy across 57 classes',
    title: 'Deep learning in dermatology: CNN-based classification of skin diseases and cancer',
    venue: 'IEEE Xplore, January 2025',
    status: 'Published',
    classes: 57,
    model: 'Custom CNN vs VGG16, MobileNet, Inception V3',
    date: 'Published 16 Jan 2025',
    abstract: [
      'A custom convolutional neural network that classifies 57 types of skin disease and skin cancer at 96.64% accuracy, built to make dermatological diagnosis faster and more consistent than traditional methods.',
      'Benchmarked on the same dataset against VGG16, MobileNet, Inception V3 and a sequential CNN, the custom model was both more accurate and faster per image. Data augmentation with TensorFlow\'s ImageDataGenerator and careful tuning keep it reliable on real-world images, supporting earlier detection and treatment.',
    ],
    baselines: ['VGG16', 'MobileNet', 'Inception V3', 'Sequential CNN'],
    methods: ['Custom CNN', 'Data augmentation', 'ImageDataGenerator', 'TensorFlow'],
    text: 'A custom CNN that outperformed VGG16, MobileNet and Inception V3, using data augmentation for real-time diagnosis.',
    href: 'https://ieeexplore.ieee.org/document/10837323',
  },
  {
    id: 'paper-brain',
    figure: '97.1%',
    figureLabel: 'accuracy across 4 MRI classes',
    title: 'Deep learning-based brain tumour identification using a custom CNN',
    venue: 'Springer, in publication',
    status: 'In publication',
    classes: 4,
    classNames: ['Glioma', 'Meningioma', 'Pituitary', 'No tumour'],
    model: 'Custom CNN with dilated convolutions + residual links',
    abstract: [
      'A custom CNN that classifies brain MRI scans into glioma, meningioma, pituitary tumour or no tumour, reaching 97.1% test accuracy, aimed at faster and more consistent neuroimaging diagnosis.',
      'Compared with Xception, ResNet50, EfficientNetB4, DenseNet121 and MobileNetV2, it balances accuracy with computational cost, so it suits real-time use even in resource-limited clinics. Dilated convolutions, residual connections and data augmentation help it generalise from limited labelled data, a common constraint in medical imaging.',
    ],
    baselines: ['Xception', 'ResNet50', 'EfficientNetB4', 'DenseNet121', 'MobileNetV2'],
    methods: ['Dilated convolutions', 'Residual connections', 'Data augmentation', 'TensorFlow'],
    text: 'Dilated convolutions and residual connections classify glioma, meningioma, pituitary tumour and no tumour, light enough for resource-limited clinics.',
  },
];

export const about = {
  /** pct drives the ring (CGPA 9/10 = 90%). */
  education: [
    { id: 'edu-btech', title: 'B.Tech, Computer Science & Engineering (AI & ML)', org: 'Bennett University, Greater Noida', when: '2022 – 2026', score: '9.0', unit: 'CGPA / 10', pct: 90 },
    { id: 'edu-12', title: 'Class 12, CBSE', org: 'Spring Dales Public School, Mawana', when: '2020 – 2021', score: '92.6%', unit: 'Senior secondary', pct: 92.6 },
    { id: 'edu-10', title: 'Class 10, CBSE', org: 'Shriram School, Mawana', when: '2018 – 2019', score: '93.6%', unit: 'Secondary', pct: 93.6 },
  ],
  achievements: [
    { id: 'ach-amazon', text: 'Amazon ML Challenge 2024: rank 409 of 30,000+ teams' },
    { id: 'ach-hackeye', text: 'HackEye Hackathon 2022: 10th of 100 teams' },
  ],
  beyond: [
    { id: 'beyond-freelance', title: 'Freelance AI and web developer', when: 'Since 2021', text: 'AI/ML and web projects for about 10 clients across the USA, Korea and India, on Upwork, Fiverr and directly, with 5-star ratings.', stat: '~10', statLabel: 'clients worldwide', chips: ['USA', 'Korea', 'India', '5-star ratings'], href: 'https://www.upwork.com/freelancers/~01f371feafd31d5190', cta: 'Hire him on Upwork' },
    { id: 'beyond-youtube', title: 'YouTube educator', when: 'Since 2022', text: 'Teaches AI, ML, web development and competitive programming: 19 videos with over 2 lakh (212,000+) views.', stat: '2 lakh+', statLabel: 'views on his videos', chips: ['AI', 'ML', 'Web development', 'Competitive programming'], href: 'https://www.youtube.com/@yooshamirza', cta: 'Watch on YouTube' },
  ],
  skills: [
    { group: 'Generative AI', items: ['LLMs', 'RAG', 'MCP', 'Agentic AI', 'Voice agents', 'Transformers', 'Diffusion models'] },
    { group: 'Machine learning', items: ['PyTorch', 'TensorFlow', 'Keras', 'OpenCV', 'scikit-learn', 'Hugging Face', 'Optuna'] },
    { group: 'Engineering', items: ['Python', 'TypeScript', 'C++', 'Java', 'FastAPI', 'Flask', 'Django', 'Node.js', 'Express', 'React', 'Vue'] },
    { group: 'Data', items: ['PostgreSQL', 'MySQL', 'MongoDB', 'SQLite', 'Firebase', 'Pandas', 'NumPy'] },
    { group: 'Cloud & DevOps', items: ['Docker', 'Kubernetes', 'AWS', 'Google Cloud', 'Azure', 'Nginx', 'Git'] },
  ],
};

/**
 * Expertise, worked out from the experience above: each pillar lists the roles,
 * projects and papers that prove it. The page counts the evidence to draw the
 * depth meters, and Nexus can point at any of it.
 */
export type Pillar = { id: string; area: Area; title: string; line: string; evidence: string[]; skills: string[] };

export const pillars: Pillar[] = [
  {
    id: 'pillar-voice', area: 'voice', title: 'Voice agents that take real calls',
    line: 'Telephony, low-latency STT/TTS and speech-to-speech models, call flows, tool calling and go-live testing. His main focus today.',
    evidence: ['job-weya', 'job-neurabit', 'proj-instabus', 'proj-docusense', 'proj-dental', 'proj-nexus'],
    skills: ['Gemini Live', 'STT/TTS', 'Telephony', 'Prompt design'],
  },
  {
    id: 'pillar-llm', area: 'llm', title: 'LLMs, RAG and agentic AI',
    line: 'Fine-tuned multilingual LLMs, retrieval pipelines that keep answers grounded, and agents that use tools through MCP.',
    evidence: ['job-sarvm', 'job-neurabit', 'proj-mcp', 'proj-medisum', 'proj-docusense', 'proj-t2v'],
    skills: ['RAG', 'MCP', 'Vector DBs', 'Fine-tuning'],
  },
  {
    id: 'pillar-vision', area: 'vision', title: 'Computer vision and medical imaging',
    line: 'Custom CNNs that beat larger pre-trained models, two papers, and wound segmentation in production.',
    evidence: ['paper-skin', 'paper-brain', 'job-neurabit', 'proj-skin', 'proj-brain', 'proj-sat'],
    skills: ['CNNs', 'Segmentation', 'OpenCV', 'TensorFlow'],
  },
  {
    id: 'pillar-ml', area: 'ml', title: 'Forecasting and applied ML',
    line: 'Time-series models for markets and air quality, and unsupervised anomaly detection for manufacturing.',
    evidence: ['job-iit', 'job-bit', 'proj-crypto', 'proj-aqi'],
    skills: ['LSTM', 'XGBoost', 'Autoencoders', 'Optuna'],
  },
  {
    id: 'pillar-web', area: 'web', title: 'Full-stack product',
    line: 'He ships the whole thing: React front ends, Python back ends and deploys, plus client work since 2021.',
    evidence: ['job-sync', 'job-octanet', 'job-dabotics', 'oss-sellbird', 'proj-nexus', 'proj-alumni'],
    skills: ['React', 'TypeScript', 'FastAPI', 'Docker'],
  },
];

/** Merged open-source contributions. */
export const openSource = [
  {
    id: 'oss-sellbird',
    repo: 'Sellbird',
    /** shown once, small, next to the title */
    formerly: 'Harvey',
    about: 'An open-source AI outreach agent that runs on your Claude or ChatGPT plan.',
    /** stars and forks are fetched live from this repo; the values below are the fallback */
    ghRepo: 'ethanplusai/sellbird',
    forks: '',
    pr: 'PR #40',
    merged: 'Merged Oct 2026',
    size: '+596 lines',
    stars: '4.7k+',
    title: 'Send drafts from your own Gmail, and a live status panel',
    points: [
      ['Open in Gmail', 'send drafted cold emails from your own inbox in one click'],
      ['Mark as sent', 'track manual sends without ever losing a reply'],
      ['Live status panel', 'real-time pipeline progress, time left and stuck-job detection'],
      ['Tested', 'shipped with tests covering the edge cases'],
    ] as [string, string][],
    stack: ['Python', 'FastAPI', 'JavaScript'],
    links: [{ label: 'Merged PR', href: 'https://github.com/ethanplusai/sellbird/pull/40' }, { label: 'Sellbird repo', href: 'https://github.com/ethanplusai/sellbird' }],
  },
];

/** Year-by-year path, shown in About. */
export const journey = [
  { year: '2021', text: 'Starts freelancing in AI and web' },
  { year: '2022', text: 'B.Tech in AI & ML at Bennett, YouTube channel' },
  { year: '2023', text: 'Web and Python internships at Octanet and Dabotics' },
  { year: '2024', text: 'ML research at IIT Indore and BIT Sindri' },
  { year: '2025', text: 'IEEE paper, Sarvm.ai, then joins Neurabit as an intern' },
  { year: '2026', text: 'Full-time at Neurabit, then AI forward deployed engineer at Weya.ai' },
];

/** Sections in page order — used by the nav, the context tracker and Nexus's show_on_page tool. */
/**
 * Leadership & community (his own words, 11 Nov 2026). `from`/`to` are positions on his 4 college years
 * (0 = start of 1st year, 4 = end of 4th year), so bars start at a year boundary and read at a glance.
 */
export type LeadRole = { id: string; title: string; org: string; when: string; span: string; text: string; from: number; to: number };
export const leadership: LeadRole[] = [
  { id: 'lead-batchrep', title: 'Batch Representative', org: 'Bennett University', when: '2022 – 2026', span: 'All 4 years', text: 'Represented his batch for the whole of his B.Tech, every year from the first semester to the last.', from: 0, to: 4 },
  { id: 'lead-placement', title: 'Placement Committee Member', org: 'Bennett University', when: '2024 – 2025', span: 'Full 3rd year', text: 'Part of the committee that runs campus placements with recruiting companies, for his entire third year.', from: 2, to: 3 },
  { id: 'lead-codechef', title: 'Core Team, CodeChef BU', org: "The university's competitive programming club", when: '2022', span: '1st semester', text: 'Joined the core team of the coding club in his very first semester.', from: 0, to: 0.5 },
];

export const sections = [
  { id: 'intro', label: 'Intro' },
  { id: 'expertise', label: 'Expertise' },
  { id: 'work', label: 'Work' },
  { id: 'projects', label: 'Projects' },
  { id: 'opensource', label: 'Open source' },
  { id: 'leadership', label: 'Leadership' },
  { id: 'research', label: 'Research' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
] as const;
