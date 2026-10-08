// Central course data and lessons catalog
export const coursesData = [
  {
    id: 1,
    slug: 'javascript-fundamentals',
    title: 'JavaScript Fundamentals',
    instructor: 'Sarah Chen',
    progress: 65,
    status: 'in-progress',
    totalLessons: 24,
    completedLessons: 16,
    lastAccessed: '2 hours ago',
    thumbnail: '🟨',
    level: 'Beginner',
    moduleLabel: 'MODULE 2 • LESSON 4',
    lessonTitle: 'Variables, Functions & Scope',
    lessonDescription: 'Master the fundamental building blocks of JavaScript: variables, arrow functions, and scope.',
    objectives: [
      'Understand the difference between let, const, and var.',
      'Declare and invoke arrow functions and higher-order functions.',
      'Understand lexical scope and closures.',
      'Execute JavaScript and inspect console output in real-time.'
    ],
    video: {
      duration: '15 min',
      title: 'JavaScript Scope & Modern Functions',
      description: 'Join Sarah Chen as she breaks down modern ES6 syntax, functions, and lexical scope with practical examples.'
    },
    tutorial: {
      label: 'TUTORIAL',
      title: 'Declaring Variables and Arrow Functions',
      p1: 'JavaScript is a dynamically typed language that powers interactivity on the web. In modern JavaScript (ES6+), we use const and let instead of var to ensure proper block scoping.',
      p2: 'Arrow functions provide a concise syntax for writing function expressions and do not bind their own this value.',
      codeSnippet: `// 1. Block-scoped variable declaration
const appName = "CodeLearn";
let userScore = 95;

// 2. Arrow function
const formatUserStatus = (name, score) => {
  const passed = score >= 70;
  return \`\${name} (\${score}pts): \${passed ? "PASSED" : "NEEDS RETAKE"}\`;
};

console.log(formatUserStatus("Alex", userScore));`
    },
    starterCode: `// Try writing JavaScript!
const calculateDiscount = (price, percent) => {
  const discount = (price * percent) / 100;
  const finalPrice = price - discount;
  return \`Original: $\${price} | Discount: $\${discount} | Final: $\${finalPrice}\`;
};

console.log(calculateDiscount(120, 20));
console.log("Ready for the next lesson!");`,
    codeType: 'javascript',
    previewType: 'console',
    quiz: {
      question: 'Which keyword declares a block-scoped variable that cannot be reassigned?',
      options: [
        { value: 'var', label: 'var' },
        { value: 'const', label: 'const' },
        { value: 'let', label: 'let' },
        { value: 'function', label: 'function' }
      ],
      correctAnswer: 'const',
      correctFeedback: '🎉 Correct! const declares a block-scoped constant that cannot be reassigned.',
      incorrectFeedback: '❌ Incorrect. Hint: const creates read-only named references.'
    },
    exercise: {
      moduleLabel: 'MODULE 2 • CODING EXERCISE',
      taskTitle: 'Write a Discount Calculator Function',
      taskDescription: 'Create a JavaScript function called calculateTotal that adds a tax percentage to a price.',
      expectedResult: 'Total: $110',
      requirements: [
        'Use const or let for variable declarations.',
        'Define a function named calculateTotal.',
        'Log the output using console.log.'
      ],
      starterCode: `// Write your calculateTotal function here
const calculateTotal = (price, taxRate) => {
  const total = price + (price * taxRate);
  return \`Total: $\${total}\`;
};

console.log(calculateTotal(100, 0.10));`,
      validator: (code) => {
        const lower = code.toLowerCase();
        return lower.includes('calculatetotal') && lower.includes('console.log');
      }
    }
  },
  {
    id: 2,
    slug: 'react-for-beginners',
    title: 'React for Beginners',
    instructor: 'Alex Rivera',
    progress: 30,
    status: 'in-progress',
    totalLessons: 18,
    completedLessons: 5,
    lastAccessed: 'Yesterday',
    thumbnail: '⚛️',
    level: 'Beginner',
    moduleLabel: 'MODULE 1 • LESSON 3',
    lessonTitle: 'Components, Props & JSX',
    lessonDescription: 'Learn how to build reusable, declarative UI building blocks with React functional components and JSX.',
    objectives: [
      'Understand declarative UI concepts and the Virtual DOM.',
      'Write JSX markup with embedded JavaScript expressions.',
      'Pass and access props inside functional components.',
      'Render dynamic lists using the map() method.'
    ],
    video: {
      duration: '14 min',
      title: 'Components, Props & Modern JSX',
      description: 'Alex Rivera demonstrates how to split complex UIs into clean, modular React components.'
    },
    tutorial: {
      label: 'TUTORIAL',
      title: 'Understanding Components & JSX',
      p1: 'React lets you build user interfaces out of individual pieces called components. You create components by defining functions that return JSX markup.',
      p2: 'Props allow parent components to pass data down to child components, making your interface dynamic and customizable.',
      codeSnippet: `// Functional Component with Props
function CourseCard({ title, instructor, level }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>Instructor: {instructor}</p>
      <span className="badge">{level}</span>
    </div>
  );
}`
    },
    starterCode: `<div style="font-family: sans-serif; padding: 16px; background: #1e293b; color: #f8fafc; border-radius: 12px; border: 1px solid #334155;">
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
    <span style="font-size: 24px;">⚛️</span>
    <h3 style="margin: 0; color: #38bdf8;">React User Card</h3>
  </div>
  <p style="color: #94a3b8; font-size: 14px;">Welcome to declarative UI with React component simulation.</p>
  <button style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">
    View Enrolled Courses (3)
  </button>
</div>`,
    codeType: 'html',
    previewType: 'html',
    quiz: {
      question: 'What hook is used to add local state to a functional React component?',
      options: [
        { value: 'useState', label: 'useState' },
        { value: 'useEffect', label: 'useEffect' },
        { value: 'useContext', label: 'useContext' },
        { value: 'useReducer', label: 'useReducer' }
      ],
      correctAnswer: 'useState',
      correctFeedback: '🎉 Correct! useState enables functional components to maintain internal reactive state.',
      incorrectFeedback: '❌ Incorrect. Hint: It starts with use and deals with state.'
    },
    exercise: {
      moduleLabel: 'MODULE 1 • CODING EXERCISE',
      taskTitle: 'Create a Reusable Badge Component',
      taskDescription: 'Build a component or markup that renders a styled status badge displaying Active Student.',
      expectedResult: 'Active Student badge rendered with styling',
      requirements: [
        'Render a badge container element.',
        'Display the text "Active Student".',
        'Apply styling for background color and padding.'
      ],
      starterCode: `<div style="padding: 20px; background: #0f172a; font-family: sans-serif;">
  <span style="background: #10b981; color: white; padding: 6px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600;">
    Active Student
  </span>
</div>`,
      validator: (code) => {
        const lower = code.toLowerCase();
        return lower.includes('active student');
      }
    }
  },
  {
    id: 3,
    slug: 'python-crash-course',
    title: 'Python Crash Course',
    instructor: 'James Wilson',
    progress: 100,
    status: 'completed',
    totalLessons: 20,
    completedLessons: 20,
    lastAccessed: '3 days ago',
    thumbnail: '🐍',
    level: 'Beginner',
    moduleLabel: 'MODULE 4 • LESSON 5',
    lessonTitle: 'Python Functions, Lists & File I/O',
    lessonDescription: 'Review completed core Python syntax, list comprehensions, dictionary lookups, and practical automation.',
    objectives: [
      'Write clean, readable Python with PEP 8 standards.',
      'Utilize list comprehensions and dictionary operations.',
      'Handle exceptions safely with try / except blocks.',
      'Perform data parsing and formatting.'
    ],
    video: {
      duration: '16 min',
      title: 'Python Essentials & Data Handling',
      description: 'James Wilson demonstrates clean Python syntax, list operations, and exception handling.'
    },
    tutorial: {
      label: 'TUTORIAL',
      title: 'Python Essentials & Best Practices',
      p1: 'Python is renowned for its readability and simplicity. Instead of curly braces, Python uses indentation to define code blocks.',
      p2: 'Functions are defined using the def keyword, and values are returned with return.',
      codeSnippet: `# Python Function Example
def calculate_grade(score):
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    else:
        return "C"

students = {"Alex": 92, "Taylor": 84}
for name, score in students.items():
    print(f"{name}: Grade {calculate_grade(score)}")`
    },
    starterCode: `# Python Practice
def greet_student(name, course):
    return f"Welcome back {name}! You have completed {course}."

print(greet_student("Developer", "Python Crash Course"))
grades = [92, 88, 95, 100]
print(f"Average score: {sum(grades) / len(grades)}%")`,
    codeType: 'python',
    previewType: 'console',
    quiz: {
      question: 'Which symbol is used for single-line comments in Python?',
      options: [
        { value: '#', label: '#' },
        { value: '//', label: '//' },
        { value: '/*', label: '/*' },
        { value: '--', label: '--' }
      ],
      correctAnswer: '#',
      correctFeedback: '🎉 Correct! In Python, # starts a single-line comment.',
      incorrectFeedback: '❌ Incorrect. Hint: Python does not use C-style //.'
    },
    exercise: {
      moduleLabel: 'MODULE 4 • CODING EXERCISE',
      taskTitle: 'Calculate List Averages in Python',
      taskDescription: 'Write a Python function to compute the average of a list of numbers.',
      expectedResult: 'Average: 85.0',
      requirements: [
        'Define a function named compute_average.',
        'Accept a list of numbers.',
        'Print or return the average score.'
      ],
      starterCode: `def compute_average(scores):
    total = sum(scores)
    return total / len(scores)

test_scores = [80, 85, 90]
print(f"Average: {compute_average(test_scores)}")`,
      validator: (code) => {
        const lower = code.toLowerCase();
        return lower.includes('compute_average') || lower.includes('average');
      }
    }
  },
  {
    id: 4,
    slug: 'typescript-mastery',
    title: 'TypeScript Mastery',
    instructor: 'Emily Park',
    progress: 0,
    status: 'not-started',
    totalLessons: 22,
    completedLessons: 0,
    lastAccessed: 'Never',
    thumbnail: '💙',
    level: 'Intermediate',
    moduleLabel: 'MODULE 1 • LESSON 1',
    lessonTitle: 'Static Types, Interfaces & Generics',
    lessonDescription: 'Start your journey with typed JavaScript! Learn type annotations, interfaces, union types, and strict mode.',
    objectives: [
      'Understand how the TypeScript compiler prevents runtime errors.',
      'Declare primitive and complex types for variables and functions.',
      'Create and extend reusable interfaces.',
      'Use union types and type aliases for robust modeling.'
    ],
    video: {
      duration: '18 min',
      title: 'Getting Started with TypeScript',
      description: 'Emily Park introduces static typing, interfaces, and how TypeScript supercharges developer productivity.'
    },
    tutorial: {
      label: 'TUTORIAL',
      title: 'Introduction to Static Typing & Interfaces',
      p1: 'TypeScript adds optional static types to JavaScript. It checks code at compile-time to catch bugs before they ever reach production.',
      p2: 'Interfaces allow you to define strict contracts for object shapes, making refactoring safe and effortless.',
      codeSnippet: `// TypeScript Interface Definition
interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  isActive?: boolean;
}

const user: UserProfile = {
  id: 101,
  name: "Emily Park",
  email: "emily@example.com",
  role: "instructor"
};`
    },
    starterCode: `// TypeScript Interface & Function Simulation
interface CourseProgress {
  title: string;
  progress: number;
  isCompleted: boolean;
}

const checkCourseStatus = (course: CourseProgress): string => {
  return \`\${course.title}: \${course.progress}% - \${course.isCompleted ? "COMPLETED" : "IN PROGRESS"}\`;
};

console.log(checkCourseStatus({
  title: "TypeScript Mastery",
  progress: 10,
  isCompleted: false
}));`,
    codeType: 'typescript',
    previewType: 'console',
    quiz: {
      question: 'How do you define an optional property in a TypeScript interface?',
      options: [
        { value: 'property?: type', label: 'property?: type' },
        { value: 'property*: type', label: 'property*: type' },
        { value: 'property!: type', label: 'property!: type' },
        { value: 'optional property: type', label: 'optional property: type' }
      ],
      correctAnswer: 'property?: type',
      correctFeedback: '🎉 Correct! The question mark (?) marks a property as optional in TypeScript.',
      incorrectFeedback: '❌ Incorrect. Hint: It uses a question mark.'
    },
    exercise: {
      moduleLabel: 'MODULE 1 • CODING EXERCISE',
      taskTitle: 'Define a Student Profile Interface',
      taskDescription: 'Create a TypeScript interface Student with id, name, and grade properties.',
      expectedResult: 'Valid TypeScript Interface and object',
      requirements: [
        'Define interface Student.',
        'Include id (number) and name (string).',
        'Create a student object satisfying the interface.'
      ],
      starterCode: `interface Student {
  id: number;
  name: string;
  grade: number;
}

const newStudent: Student = {
  id: 42,
  name: "Alex",
  grade: 98
};

console.log(\`Student: \${newStudent.name}, Grade: \${newStudent.grade}\`);`,
      validator: (code) => {
        const lower = code.toLowerCase();
        return lower.includes('interface student') || lower.includes('student');
      }
    }
  },
  {
    id: 5,
    slug: 'fullstack-nodejs',
    title: 'Full Stack with Node.js',
    instructor: 'David Kim',
    progress: 45,
    status: 'in-progress',
    totalLessons: 30,
    completedLessons: 14,
    lastAccessed: '5 hours ago',
    thumbnail: '🟢',
    level: 'Intermediate',
    moduleLabel: 'MODULE 2 • LESSON 3',
    lessonTitle: 'RESTful APIs & Express Routing',
    lessonDescription: 'Build production-ready backend web servers and RESTful APIs using Node.js and Express.',
    objectives: [
      'Understand non-blocking asynchronous I/O in Node.js.',
      'Configure an Express router with GET, POST, PUT, DELETE verbs.',
      'Parse incoming request bodies and query parameters.',
      'Implement middleware for error logging and security headers.'
    ],
    video: {
      duration: '20 min',
      title: 'Building RESTful APIs with Node & Express',
      description: 'David Kim guides you through setting up routes, middleware, and handling JSON responses.'
    },
    tutorial: {
      label: 'TUTORIAL',
      title: 'Building Express API Routes',
      p1: 'Node.js allows JavaScript to run server-side outside the browser. Combined with Express, you can build fast web APIs with minimal boilerplate.',
      p2: 'REST endpoints use HTTP methods to communicate intent: GET to read, POST to create, and DELETE to remove resources.',
      codeSnippet: `// Express REST API Example
const express = require('express');
const app = express();
app.use(express.json());

app.get('/api/courses', (req, res) => {
  res.json({ success: true, count: 6, data: ['JS', 'React', 'Node'] });
});

app.listen(5000, () => console.log('Server running on port 5000'));`
    },
    starterCode: `// Node.js API simulation
const courses = [
  { id: 1, title: "JavaScript Fundamentals", active: true },
  { id: 2, title: "Full Stack Node.js", active: true }
];

const handleGetCourses = (statusFilter) => {
  const filtered = courses.filter(c => c.active === (statusFilter === 'active'));
  return {
    statusCode: 200,
    timestamp: new Date().toISOString(),
    resultsCount: filtered.length,
    data: filtered
  };
};

console.log(JSON.stringify(handleGetCourses('active'), null, 2));`,
    codeType: 'javascript',
    previewType: 'console',
    quiz: {
      question: 'Which built-in Node.js module provides utilities for working with file and directory paths?',
      options: [
        { value: 'path', label: 'path' },
        { value: 'fs', label: 'fs' },
        { value: 'http', label: 'http' },
        { value: 'url', label: 'url' }
      ],
      correctAnswer: 'path',
      correctFeedback: '🎉 Correct! The path module provides utilities for handling file and directory paths.',
      incorrectFeedback: '❌ Incorrect. Hint: It deals directly with file paths.'
    },
    exercise: {
      moduleLabel: 'MODULE 2 • CODING EXERCISE',
      taskTitle: 'Create a GET Endpoint Handler',
      taskDescription: 'Simulate an Express route handler that returns a JSON list of active users.',
      expectedResult: 'Status 200 with JSON payload',
      requirements: [
        'Define a response payload object.',
        'Include statusCode: 200.',
        'Print or output the payload using console.log.'
      ],
      starterCode: `const getApiResponse = () => {
  return {
    status: 200,
    message: "Success",
    server: "Node.js/Express"
  };
};

console.log(getApiResponse());`,
      validator: (code) => {
        const lower = code.toLowerCase();
        return lower.includes('200') && lower.includes('console.log');
      }
    }
  },
  {
    id: 6,
    slug: 'data-structures-algorithms',
    title: 'Data Structures & Algorithms',
    instructor: 'Michael Torres',
    progress: 100,
    status: 'completed',
    totalLessons: 28,
    completedLessons: 28,
    lastAccessed: '1 week ago',
    thumbnail: '🧠',
    level: 'Advanced',
    moduleLabel: 'MODULE 5 • LESSON 4',
    lessonTitle: 'Hash Tables, Arrays & Big-O Notation',
    lessonDescription: 'Master computational complexity, hash collision resolution, two-pointer patterns, and binary search.',
    objectives: [
      'Analyze time and space complexity with Big-O notation.',
      'Implement fast lookups using Hash Maps and Sets.',
      'Apply the Two-Pointer pattern to solve array problems in O(n) time.',
      'Understand binary search and recursive tree traversals.'
    ],
    video: {
      duration: '22 min',
      title: 'Big-O Analysis & Problem Solving Patterns',
      description: 'Michael Torres breaks down algorithmic trade-offs, space vs time, and common interview questions.'
    },
    tutorial: {
      label: 'TUTORIAL',
      title: 'Algorithmic Complexity & Hash Tables',
      p1: 'Big-O notation describes the worst-case time or space requirement of an algorithm as the input size n grows.',
      p2: 'Hash tables offer O(1) average-time complexity for lookups, insertions, and deletions, making them one of the most powerful tools in computer science.',
      codeSnippet: `// Two Sum using Hash Map: O(n) Time Complexity
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`
    },
    starterCode: `// Two Sum Algorithm Demonstration
function twoSum(nums, target) {
  const seen = {};
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (diff in seen) {
      return [seen[diff], i];
    }
    seen[nums[i]] = i;
  }
  return [];
}

const numbers = [2, 7, 11, 15];
const target = 9;
const result = twoSum(numbers, target);
console.log(\`Indices found: [\${result.join(', ')}] -> Values: \${numbers[result[0]]} + \${numbers[result[1]]} = \${target}\`);`,
    codeType: 'javascript',
    previewType: 'console',
    quiz: {
      question: 'What is the average time complexity of finding an element in a Hash Map?',
      options: [
        { value: 'O(1)', label: 'O(1)' },
        { value: 'O(n)', label: 'O(n)' },
        { value: 'O(log n)', label: 'O(log n)' },
        { value: 'O(n^2)', label: 'O(n^2)' }
      ],
      correctAnswer: 'O(1)',
      correctFeedback: '🎉 Correct! Hash maps offer constant O(1) average time complexity.',
      incorrectFeedback: '❌ Incorrect. Hint: Key-value hash lookups execute in constant time.'
    },
    exercise: {
      moduleLabel: 'MODULE 5 • CODING EXERCISE',
      taskTitle: 'Implement Binary Search',
      taskDescription: 'Write a binary search function to find an element index in a sorted array in O(log n) time.',
      expectedResult: 'Index of target: 3',
      requirements: [
        'Accept a sorted array and a target number.',
        'Use low, high pointers and while loop.',
        'Return the index if found, or -1.'
      ],
      starterCode: `function binarySearch(arr, target) {
  let low = 0;
  let high = arr.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}

const sortedList = [10, 20, 30, 40, 50];
console.log("Index of 40:", binarySearch(sortedList, 40));`,
      validator: (code) => {
        const lower = code.toLowerCase();
        return lower.includes('binarysearch') && lower.includes('console.log');
      }
    }
  },
  {
    id: 7,
    slug: 'html-fundamentals',
    title: 'HTML Fundamentals',
    instructor: 'Dr. Sarah Jenkins',
    progress: 45,
    status: 'in-progress',
    totalLessons: 24,
    completedLessons: 11,
    lastAccessed: 'Today',
    thumbnail: '🌐',
    level: 'Beginner',
    moduleLabel: 'MODULE 1 • LESSON 1',
    lessonTitle: 'Introduction to HTML',
    lessonDescription: 'Learn the basics of HTML and understand how web pages are structured with semantic markup.',
    objectives: [
      'Understand what HTML is and how browsers interpret it.',
      'Explain the basic structure of an HTML document.',
      'Use common HTML elements, headings, and tags.',
      'Create a simple, accessible HTML webpage.'
    ],
    video: {
      duration: '12 min',
      title: 'Introduction to HTML & Web Standards',
      description: 'Click play to start learning the fundamentals of HTML structure, tags, and document layout.'
    },
    tutorial: {
      label: 'TUTORIAL',
      title: 'What is HTML?',
      p1: 'HTML stands for HyperText Markup Language. It is used to create and structure content on web pages.',
      p2: 'HTML uses elements called tags to tell the browser how different parts of a webpage should be displayed.',
      codeSnippet: `<!DOCTYPE html>
<html>
<head>
    <title>My First Page</title>
</head>
<body>
    <h1>Hello, Developer!</h1>
    <p>Welcome to HTML.</p>
</body>
</html>`
    },
    starterCode: `<h1>Hello, Developer!</h1>\n<p>This is my first live HTML code preview!</p>`,
    codeType: 'html',
    previewType: 'html',
    quiz: {
      question: 'Which HTML tag is used to create the largest heading?',
      options: [
        { value: 'h1', label: '<h1>' },
        { value: 'heading', label: '<heading>' },
        { value: 'head', label: '<head>' },
        { value: 'h6', label: '<h6>' }
      ],
      correctAnswer: 'h1',
      correctFeedback: '🎉 Correct! <h1> defines the highest level heading.',
      incorrectFeedback: '❌ Incorrect. Hint: Heading tags range from <h1> (largest) to <h6> (smallest).'
    },
    exercise: {
      moduleLabel: 'MODULE 1 • CODING EXERCISE',
      taskTitle: 'Create Your First Heading',
      taskDescription: 'Test your understanding of HTML headings by completing the coding task below.',
      expectedResult: 'Hello, Developer!',
      requirements: [
        'Use the correct HTML heading element (<h1>).',
        'The heading must display "Hello, Developer!".',
        'Write valid HTML code.'
      ],
      starterCode: `<!DOCTYPE html>\n<html>\n<body>\n\n<h1>Hello, Developer!</h1>\n\n</body>\n</html>`,
      validator: (code) => {
        const lower = code.toLowerCase().replace(/\s+/g, ' ');
        return lower.includes('<h1>hello, developer!</h1>') || lower.includes('<h1> hello, developer! </h1>');
      }
    }
  },
  {
    id: 8,
    slug: 'css-fundamentals',
    title: 'CSS Fundamentals',
    instructor: 'Dr. Sarah Jenkins',
    progress: 0,
    status: 'not-started',
    totalLessons: 20,
    completedLessons: 0,
    lastAccessed: 'Never',
    thumbnail: '🎨',
    level: 'Beginner',
    moduleLabel: 'MODULE 1 • LESSON 1',
    lessonTitle: 'CSS Selectors & Box Model',
    lessonDescription: 'Learn how to style websites and create responsive, beautiful interfaces with CSS3.',
    objectives: [
      'Understand CSS syntax, properties, and value types.',
      'Master margins, padding, borders, and content box calculations.',
      'Work with typography, colors, and shadows.',
      'Build modern card layouts with Flexbox.'
    ],
    video: {
      duration: '15 min',
      title: 'Styling the Web with CSS3',
      description: 'Learn modern CSS selectors, the box model, and layout techniques to make websites beautiful.'
    },
    tutorial: {
      label: 'TUTORIAL',
      title: 'CSS Box Model & Selectors',
      p1: 'CSS (Cascading Style Sheets) describes how HTML elements should be presented on screen.',
      p2: 'Every element in CSS is a rectangular box consisting of margins, borders, padding, and the actual content.',
      codeSnippet: `/* Modern Card Styling */
.card {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 24px;
  color: #f8fafc;
}`
    },
    starterCode: `<div style="font-family: sans-serif; padding: 24px; background: linear-gradient(135deg, #1e1b4b, #1e293b); border: 1px solid #4338ca; border-radius: 14px; color: white;">
  <h2 style="margin-top: 0; color: #a5b4fc;">🎨 CSS Box Model</h2>
  <p style="color: #cbd5e1;">Margins provide outer spacing, padding provides inner breathing room.</p>
  <div style="background: rgba(99, 102, 241, 0.2); border: 1px dashed #818cf8; padding: 12px; border-radius: 8px;">
    Inner Box with Padding &amp; Border
  </div>
</div>`,
    codeType: 'html',
    previewType: 'html',
    quiz: {
      question: 'Which CSS property defines the space between the content and the element border?',
      options: [
        { value: 'padding', label: 'padding' },
        { value: 'margin', label: 'margin' },
        { value: 'border-spacing', label: 'border-spacing' },
        { value: 'gap', label: 'gap' }
      ],
      correctAnswer: 'padding',
      correctFeedback: '🎉 Correct! padding defines the inner space between the content and the border.',
      incorrectFeedback: '❌ Incorrect. Hint: margin is on the outside of the border; padding is on the inside.'
    },
    exercise: {
      moduleLabel: 'MODULE 1 • CODING EXERCISE',
      taskTitle: 'Style a Hero Callout Card',
      taskDescription: 'Create a styled card with custom background, padding, and border radius.',
      expectedResult: 'Hero callout card rendered with padding and colors',
      requirements: [
        'Use background styling.',
        'Apply padding to create spacing.',
        'Include a heading and a styled button.'
      ],
      starterCode: `<div style="padding: 24px; background: #0f172a; border-radius: 12px; color: white; font-family: sans-serif;">
  <h2 style="color: #38bdf8;">Welcome to CSS!</h2>
  <p>Styled with inline CSS properties.</p>
</div>`,
      validator: (code) => {
        const lower = code.toLowerCase();
        return lower.includes('padding') || lower.includes('background');
      }
    }
  }
];

export const getCourseBySlug = (slugOrId) => {
  if (!slugOrId) return coursesData.find(c => c.slug === 'html-fundamentals') || coursesData[0];
  const found = coursesData.find(c => 
    c.slug.toLowerCase() === String(slugOrId).toLowerCase() || 
    String(c.id) === String(slugOrId)
  );
  return found || coursesData.find(c => c.slug === 'html-fundamentals') || coursesData[0];
};
