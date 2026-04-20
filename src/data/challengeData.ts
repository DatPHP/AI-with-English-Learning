export interface ChallengeDay {
  day: number;
  title: string;
  category: string;
  keywords: { word: string; meaning: string; example: string }[];
  questions: {
    question: string;
    description: string; // "Cách triển khai ý"
    starters: string[]; // Gợi ý mở đầu
  }[];
}

export const speakingChallengeData: ChallengeDay[] = [
  {
    day: 1,
    title: "Setting Your English Goals",
    category: "Giai đoạn 1: Cơ bản và hằng ngày",
    keywords: [
      { word: "set a goal", meaning: "đặt mục tiêu", example: "I set a goal to achieve an IELTS band score of 7.5 this year." },
      { word: "long-term goal", meaning: "mục tiêu dài hạn", example: "My long-term goal is to achieve a 7.5 in IELTS." },
      { word: "immerse yourself in", meaning: "đắm mình vào", example: "To improve fast, you must immerse yourself in the language every day." },
      { word: "short-term goal", meaning: "mục tiêu ngắn hạn", example: "A short-term goal of mine is to improve my daily vocabulary." },
      { word: "consistent practice", meaning: "việc luyện tập kiên trì", example: "Consistent practice is the key to mastering any language." }
    ],
    questions: [
      {
        question: "Why do you want to learn English?",
        description: "goal → reason → time frame",
        starters: ["Well, my main goal right now is...", "I want to achieve this because...", "I hope I can reach this goal by..."]
      },
      {
        question: "How do you stay motivated when studying English?",
        description: "method → benefit → example",
        starters: ["One thing that really helps me is...", "One habit I rely on is..."]
      },
      {
        question: "How do you organize your English study schedule?",
        description: "plan → reason → example",
        starters: ["First, I usually...", "One strategy that works for me is...", "This helps me because..."]
      }
    ]
  },
  {
    day: 2,
    title: "Introducing Yourself and Your Background",
    category: "Giai đoạn 1: Cơ bản và hằng ngày",
    keywords: [
      { word: "be originally from", meaning: "đến từ...", example: "I’m originally from Da Lat, but I moved to Hochiminh for work." },
      { word: "currently based in", meaning: "hiện đang sống ở", example: "I am currently based in Ho Chi Minh City for work purposes." },
      { word: "introverted / extroverted", meaning: "hướng nội / hướng ngoại", example: "I’m quite introverted, but I open up easily with people I trust." },
      { word: "major (n)", meaning: "ngành học", example: "My major at university was economics." },
      { word: "professional experience", meaning: "kinh nghiệm chuyên môn", example: "I have five years of professional experience in the IT industry." }
    ],
    questions: [
      {
        question: "Can you introduce yourself?",
        description: "name/age → hometown → job/study",
        starters: ["My name is...", "I'm originally from...", "Now, I'm studying..."]
      },
      {
        question: "Where do you live now, and what do you like about it?",
        description: "current location → feeling/feature → reason",
        starters: ["I am currently based in...", "I love ... because ..."]
      }
    ]
  },
  {
    day: 3,
    title: "My Daily Routine",
    category: "Giai đoạn 1: Cơ bản và hằng ngày",
    keywords: [
      { word: "wake up early/late", meaning: "thức dậy sớm/muộn", example: "I always wake up early to prepare for my busy daily schedule." },
      { word: "hit the snooze button", meaning: "nhấn nút báo lại", example: "I admit I often hit the snooze button once or twice." },
      { word: "get ready", meaning: "chuẩn bị (vệ sinh, quần áo)", example: "It takes me about 30 minutes to get ready every morning." },
      { word: "commute (v/n)", meaning: "di chuyển đi làm/học", example: "My commute to the office is quite long, so I leave early." },
      { word: "productive morning", meaning: "buổi sáng hiệu quả", example: "I feel I have a productive morning if I finish my urgent tasks before noon." }
    ],
    questions: [
      {
        question: "What time do you usually wake up on a normal day?",
        description: "wake-up time → reason → weekend difference",
        starters: ["I usually wake up at ... because I want to ...", "The first thing I do is ..."]
      },
      {
        question: "What does your morning routine look like?",
        description: "wake up → brush teeth → get ready → breakfast → commute → start work",
        starters: ["In My morning usually starts with...", "My morning routine is pretty simple...", "After waking up,"]
      }
    ]
  },
  {
    day: 4,
    title: "Describing Your Hometown",
    category: "Giai đoạn 1: Cơ bản và hằng ngày",
    keywords: [
      { word: "hometown", meaning: "quê hương", example: "I grew up in a small coastal hometown known for its peaceful atmosphere." },
      { word: "neighborhood", meaning: "khu dân cư", example: "My neighborhood is quiet and surrounded by friendly local families." },
      { word: "local specialties", meaning: "đặc sản địa phương", example: "The local specialties in my hometown, especially seafood, are extremely fresh." },
      { word: "lively/peaceful atmosphere", meaning: "bầu không khí nhộn nhịp / yên bình", example: "I love the peaceful atmosphere, especially early in the morning." },
      { word: "cost of living", meaning: "chi phí sinh hoạt", example: "The cost of living in my hometown is fairly affordable compared to big cities." }
    ],
    questions: [
      {
        question: "Where is your hometown located?",
        description: "location → size → main feature",
        starters: ["Well, my hometown is...", "It's located in..."]
      },
      {
        question: "What do you like or dislike about the place you live?",
        description: "good features → bad features → effect on daily life",
        starters: ["Well, what I like most about where I live is...", "However, one thing I don't like is..."]
      }
    ]
  },
  {
    day: 5,
    title: "Talking About Your Work & Jobs",
    category: "Giai đoạn 1: Cơ bản và hằng ngày",
    keywords: [
      { word: "career path", meaning: "con đường sự nghiệp", example: "I'm currently focusing on a career path in digital marketing." },
      { word: "heavy workload", meaning: "khối lượng công việc lớn", example: "I often have a heavy workload at the end of the month." },
      { word: "work-life balance", meaning: "cân bằng công việc - cuộc sống", example: "Achieving a good work-life balance is crucial for mental health." },
      { word: "job satisfaction", meaning: "sự hài lòng công việc", example: "I think job satisfaction matters more than salary." },
      { word: "entry-level position", meaning: "vị trí khởi điểm", example: "After graduating, I started with an entry-level position in sales." }
    ],
    questions: [
      {
        question: "What do you do for a living?",
        description: "job title/ field → daily tasks",
        starters: ["Well, I currently work as...", "My main responsibility is..."]
      },
      {
        question: "What kind of job do you hope to have in the future?",
        description: "dream position → required skills → career objective",
        starters: ["My ultimate career goal is to...", "I aspire to become..."]
      }
    ]
  },
  {
    day: 6,
    title: "Talking About Hobbies & Interests",
    category: "Giai đoạn 1: Cơ bản và hằng ngày",
    keywords: [
      { word: "leisure time", meaning: "thời gian rảnh rỗi", example: "I spend most of my leisure time learning English." },
      { word: "unwind/relax", meaning: "thư giãn", example: "Listening to music helps me unwind after a long day." },
      { word: "recharge my batteries", meaning: "nạp lại năng lượng", example: "A long walk in the park is the best way to recharge my batteries." },
      { word: "be into something", meaning: "cực kỳ thích một hoạt động nào đó", example: "I'm really into photography these days." },
      { word: "creative activities", meaning: "các hoạt động sáng tạo", example: "Creative activities such as painting help me relax." }
    ],
    questions: [
      {
        question: "What is your favorite hobby, and how long have you been doing it?",
        description: "name of hobby → duration/frequency → what you enjoy most",
        starters: ["My favorite hobby is...", "I've been doing it for..."]
      },
      {
        question: "Do you think it is important to pursue a hobby? Why?",
        description: "importance level → benefit (mental/physical) → example",
        starters: ["Absolutely, it is extremely important...", "I prefer... because..."]
      }
    ]
  },
  {
    day: 7,
    title: "Describing a Favorite Meal or Food",
    category: "Giai đoạn 1: Cơ bản và hằng ngày",
    keywords: [
      { word: "cuisine", meaning: "ẩm thực", example: "Vietnamese cuisine is famous for its fresh ingredients." },
      { word: "dietary habits", meaning: "thói quen ăn uống", example: "My dietary habits are quite healthy; I avoid fast food." },
      { word: "signature dish", meaning: "món đặc trưng", example: "Pho is considered the signature dish of Vietnamese cuisine." },
      { word: "home-cooked meal", meaning: "bữa ăn nấu tại nhà", example: "Nothing compares to a simple home-cooked meal." }
    ],
    questions: [
      {
        question: "What kind of food do you usually enjoy eating?",
        description: "preferred food type → specific example → reason",
        starters: ["I'm particularly fond of...", "I like ... because ..."]
      },
      {
        question: "Do you prefer eating at home or eating out?",
        description: "preference → benefits → comparison",
        starters: ["I definitely prefer...", "The main reason is..."]
      }
    ]
  },
  {
    day: 8,
    title: "Sharing a Memorable Experience",
    category: "Giai đoạn 1: Cơ bản và hằng ngày",
    keywords: [
      { word: "memorable experience", meaning: "trải nghiệm đáng nhớ", example: "One of my most memorable experiences was my first solo trip." },
      { word: "step out of my comfort zone", meaning: "bước ra khỏi vùng an toàn", example: "That experience forced me to step out of my comfort zone." },
      { word: "learn a valuable lesson", meaning: "học được bài học quý giá", example: "I learned a valuable lesson about being independent." }
    ],
    questions: [
      {
        question: "Can you describe a memorable experience in your life?",
        description: "event → time → place → background",
        starters: ["One memorable experience was...", "It happened when..."]
      }
    ]
  },
  {
    day: 9,
    title: "Favorite Book, Movie, or Song",
    category: "Giai đoạn 1: Cơ bản và hằng ngày",
    keywords: [
      { word: "genre", meaning: "thể loại", example: "I usually enjoy movies in the comedy and drama genre." },
      { word: "main character", meaning: "nhân vật chính", example: "The main character is very inspiring." },
      { word: "leave a deep impression", meaning: "để lại ấn tượng sâu sắc", example: "This book left a deep impression on me." }
    ],
    questions: [
      {
        question: "What is your favorite book, movie, or song?",
        description: "name → type → general opinion",
        starters: ["My favorite ... is...", "I really enjoy it because..."]
      }
    ]
  },
  {
    day: 10,
    title: "Motivation & Discipline",
    category: "Giai đoạn 1: Cơ bản và hằng ngày",
    keywords: [
      { word: "motivation", meaning: "động lực", example: "Motivation helps me keep going." },
      { word: "self-discipline", meaning: "kỷ luật bản thân", example: "Self-discipline is more important than motivation." },
      { word: "stay consistent", meaning: "duy trì sự đều đặn", example: "It's important to stay consistent when learning a new skill." }
    ],
    questions: [
      {
        question: "What motivates you to keep learning English?",
        description: "motivation → reason → goal",
        starters: ["What motivates me most is...", "I keep learning because..."]
      }
    ]
  },
  {
    day: 11,
    title: "Exploring Technology in Daily Life",
    category: "Giai đoạn 2: Phát triển ý tưởng và thảo luận",
    keywords: [
      { word: "smart devices", meaning: "thiết bị thông minh", example: "I use many smart devices to make my life easier." },
      { word: "digital tools", meaning: "công cụ số", example: "I rely on digital tools to study and work." },
      { word: "boost productivity", meaning: "tăng hiệu suất", example: "Technology helps me boost my productivity at work." }
    ],
    questions: [
      {
        question: "What is the most important piece of technology you use every day?",
        description: "naming the device → usage → feeling",
        starters: ["The most important device is...", "I mainly use it to..."]
      }
    ]
  },
  {
    day: 12,
    title: "Discussing Money Habits and Banking",
    category: "Giai đoạn 2: Phát triển ý tưởng và thảo luận",
    keywords: [
      { word: "monthly budget", meaning: "ngân sách hàng tháng", example: "I make a monthly budget to control my expenses." },
      { word: "financial goals", meaning: "mục tiêu tài chính", example: "Buying a new laptop is one of my main financial goals." },
      { word: "save money for a rainy day", meaning: "tiết kiệm cho lúc khó khăn", example: "It’s important to save money for a rainy day." }
    ],
    questions: [
      {
        question: "Are you a person who likes to save money or spend it?",
        description: "saver or spender → reason → specific habit",
        starters: ["I'd say I'm more of a saver...", "I tend to spend money quite easily..."]
      }
    ]
  },
  {
    day: 13,
    title: "Music and Entertainment Preferences",
    category: "Giai đoạn 2: Phát triển ý tưởng và thảo luận",
    keywords: [
      { word: "a huge fan of", meaning: "người rất hâm mộ", example: "I am a huge fan of pop music." },
      { word: "binge-watch", meaning: "xem liên tục", example: "I sometimes binge-watch my favorite series on Netflix." },
      { word: "live performance", meaning: "biểu diễn trực tiếp", example: "I really enjoy watching live performances." }
    ],
    questions: [
      {
        question: "What kind of music are you a huge fan of?",
        description: "naming the genre → why → favorite artist",
        starters: ["I'm a huge fan of...", "My favorite artist is..."]
      }
    ]
  },
  {
    day: 14,
    title: "Transportation and Travel",
    category: "Giai đoạn 2: Phát triển ý tưởng và thảo luận",
    keywords: [
      { word: "daily commute", meaning: "quãng đường đi làm hằng ngày", example: "I usually listen to music during my daily commute." },
      { word: "public transport", meaning: "phương tiện công cộng", example: "Using public transport is a great way to protect the environment." },
      { word: "get stuck in traffic", meaning: "bị kẹt xe", example: "I often get stuck in traffic on my way to work." }
    ],
    questions: [
      {
        question: "How do you usually go to work or school?",
        description: "primary vehicle → why you choose it → how long it takes",
        starters: ["I usually go by...", "The main reason is..."]
      }
    ]
  },
  {
    day: 15,
    title: "Education and Lifelong Learning",
    category: "Giai đoạn 2: Phát triển ý tưởng và thảo luận",
    keywords: [
      { word: "major in", meaning: "chuyên ngành về", example: "I majored in Marketing when I was at university." },
      { word: "hands-on experience", meaning: "kinh nghiệm thực tế", example: "I learned a lot from hands-on experience during my internship." },
      { word: "soft skills", meaning: "kỹ năng mềm", example: "Soft skills are very important for your career." }
    ],
    questions: [
      {
        question: "What’s your major?",
        description: "naming the major → why → feeling now",
        starters: ["I majored in...", "I chose it because..."]
      }
    ]
  }
];
