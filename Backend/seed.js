import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Course, Concept, Progress } from './models.js';

dotenv.config();

const seedData = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Course.deleteMany({});
  await Concept.deleteMany({});
  await Progress.deleteMany({});

  const course = await Course.create({
    title: 'Data Structures & Algorithms',
    description: 'Prerequisite-aware DSA skill tree from fundamentals to Dynamic Programming.'
  });

  const rawConcepts = [
    {
      key: 'vars',
      title: '1. Variables & Data Types',
      mins: 10,
      questions: [
        { question: 'Which data type stores true or false values?', options: ['int', 'boolean', 'char'], correctIndex: 1 },
        { question: 'Which keyword declares a block-scoped variable that can be reassigned in JS?', options: ['const', 'let', 'static'], correctIndex: 1 },
        { question: 'What is the size of a standard 32-bit integer in bytes?', options: ['2 bytes', '4 bytes', '8 bytes'], correctIndex: 1 },
        { question: 'Which data type is best for storing a single character like \'A\'?', options: ['char', 'boolean', 'float'], correctIndex: 0 },
        { question: 'What happens if you reassign a variable declared with const?', options: ['It updates silently', 'Throws a TypeError', 'Converts to string'], correctIndex: 1 },
        { question: 'Which type represents numbers with decimal points?', options: ['int', 'double / float', 'byte'], correctIndex: 1 },
        { question: 'In JavaScript, what does typeof null return?', options: ['"null"', '"undefined"', '"object"'], correctIndex: 2 },
        { question: 'Which variable name is invalid in most programming languages?', options: ['_count', '2ndValue', 'totalSum'], correctIndex: 1 },
        { question: 'What is implicit type conversion also known as?', options: ['Type coercion', 'Type erasure', 'Type inference'], correctIndex: 0 },
        { question: 'Which value is considered falsy in JavaScript?', options: ['"0"', '[]', '0'], correctIndex: 2 }
      ]
    },
    {
      key: 'ctrl',
      title: '2. Control Flow (If/Else)',
      mins: 15,
      questions: [
        { question: 'Which keyword handles the fallback branch when an if condition is false?', options: ['else', 'loop', 'break'], correctIndex: 0 },
        { question: 'Which operator checks both value and data type equality in JS?', options: ['==', '=', '==='], correctIndex: 2 },
        { question: 'What statement exits a switch block immediately?', options: ['continue', 'break', 'return'], correctIndex: 1 },
        { question: 'Which logical operator returns true only if BOTH operands are true?', options: ['||', '&&', '!'], correctIndex: 1 },
        { question: 'What is the ternary operator syntax?', options: ['cond ? expr1 : expr2', 'cond : expr1 ? expr2', 'cond ?? expr1'], correctIndex: 0 },
        { question: 'In a switch statement, which clause runs if no case matches?', options: ['else', 'fallback', 'default'], correctIndex: 2 },
        { question: 'What does the ! (NOT) operator do to true?', options: ['Returns false', 'Returns 1', 'Throws error'], correctIndex: 0 },
        { question: 'What is short-circuit evaluation in A && B?', options: ['B is skipped if A is false', 'A is skipped if B is true', 'Both always run'], correctIndex: 0 },
        { question: 'Which keyword chains multiple mutually exclusive conditions?', options: ['else if', 'switch if', 'next if'], correctIndex: 0 },
        { question: 'What does the nullish coalescing operator (??) check for?', options: ['Any falsy value', 'Only null or undefined', 'Only 0 or empty string'], correctIndex: 1 }
      ]
    },
    {
      key: 'loops',
      title: '3. Loops & Iteration',
      mins: 20,
      questions: [
        { question: 'Which loop is guaranteed to execute its body at least once?', options: ['for', 'while', 'do-while'], correctIndex: 2 },
        { question: 'Which statement skips the rest of the current iteration and jumps to the next?', options: ['break', 'continue', 'exit'], correctIndex: 1 },
        { question: 'What causes an infinite loop?', options: ['Termination condition never becomes false', 'Using i++', 'Nesting two loops'], correctIndex: 0 },
        { question: 'How many times does for(let i = 0; i < 5; i++) run?', options: ['4', '5', '6'], correctIndex: 1 },
        { question: 'Which loop is ideal when the exact number of iterations is known?', options: ['for loop', 'do-while loop', 'recursive loop'], correctIndex: 0 },
        { question: 'What is the time complexity of two nested loops each running n times?', options: ['O(n)', 'O(2n)', 'O(n^2)'], correctIndex: 2 },
        { question: 'In JS, which loop iterates directly over the values of an iterable like an Array?', options: ['for...in', 'for...of', 'forEach...in'], correctIndex: 1 },
        { question: 'What does break do inside a nested inner loop?', options: ['Exits only the inner loop', 'Exits all loops', 'Restarts outer loop'], correctIndex: 0 },
        { question: 'Which part of a for(init; cond; step) loop runs after each iteration?', options: ['init', 'cond', 'step'], correctIndex: 2 },
        { question: 'What is a sentinel value in a while loop?', options: ['A special value signaling loop termination', 'The first array element', 'The loop counter'], correctIndex: 0 }
      ]
    },
    {
      key: 'arrays',
      title: '4. Arrays & Strings',
      mins: 25,
      questions: [
        { question: 'What is the time complexity to access an array element at index i?', options: ['O(1)', 'O(n)', 'O(log n)'], correctIndex: 0 },
        { question: 'Why is inserting an element at the beginning of a static array O(n)?', options: ['Memory allocation fails', 'All subsequent elements must shift right', 'Sorting is required'], correctIndex: 1 },
        { question: 'Are strings immutable in Java and JavaScript?', options: ['Yes', 'No', 'Only empty strings'], correctIndex: 0 },
        { question: 'Which technique uses two indices moving toward each other to solve sorted array problems?', options: ['Two Pointers', 'Binary Lifting', 'Topological Sort'], correctIndex: 0 },
        { question: 'What is the index of the last element in an array of length n?', options: ['n', 'n - 1', 'n + 1'], correctIndex: 1 },
        { question: 'Which algorithm finds the maximum sum contiguous subarray in O(n) time?', options: ['Kadane’s Algorithm', 'Dijkstra’s Algorithm', 'Kruskal’s Algorithm'], correctIndex: 0 },
        { question: 'What technique maintains a dynamic sub-range [left, right] over an array?', options: ['Sliding Window', 'Backtracking', 'Union-Find'], correctIndex: 0 },
        { question: 'What is a prefix sum array used for?', options: ['O(1) range sum queries', 'Sorting strings', 'Finding prime numbers'], correctIndex: 0 },
        { question: 'How are elements stored in a standard contiguous array?', options: ['Adjacent memory locations', 'Random heap nodes', 'Hash buckets'], correctIndex: 0 },
        { question: 'What is the time complexity of reversing an array of size n in-place?', options: ['O(1)', 'O(n)', 'O(n log n)'], correctIndex: 1 }
      ]
    },
    {
      key: 'funcs',
      title: '5. Functions & Scope',
      mins: 20,
      questions: [
        { question: 'Where are local variables and active function calls stored during execution?', options: ['Heap', 'Call Stack', 'Hard Disk'], correctIndex: 1 },
        { question: 'What is a pure function?', options: ['Returns same output for same input with no side effects', 'Has no parameters', 'Uses global variables'], correctIndex: 0 },
        { question: 'What is lexical (static) scope?', options: ['Scope determined by where variables/functions are written in code', 'Scope determined at runtime caller', 'Global-only visibility'], correctIndex: 0 },
        { question: 'What is a closure in JavaScript?', options: ['A function remembering its outer lexical scope even after outer returns', 'A syntax error', 'Closing a database connection'], correctIndex: 0 },
        { question: 'What are parameters vs arguments?', options: ['Parameters are in definition; arguments are passed values', 'They are identical', 'Arguments are return types'], correctIndex: 0 },
        { question: 'What does a function return by default in JS if no return statement runs?', options: ['null', '0', 'undefined'], correctIndex: 2 },
        { question: 'What is a higher-order function?', options: ['Takes a function as argument or returns a function', 'Has more than 5 parameters', 'Runs asynchronously'], correctIndex: 0 },
        { question: 'How are primitive values passed to functions in JS/Java?', options: ['Pass by value', 'Pass by pointer', 'Pass by network'], correctIndex: 0 },
        { question: 'What is function overloading?', options: ['Multiple functions with same name but different parameters', 'Calling a function too many times', 'Stack overflow'], correctIndex: 0 },
        { question: 'What is an IIFE?', options: ['Immediately Invoked Function Expression', 'Internal Integer File Engine', 'Iterative Index Function'], correctIndex: 0 }
      ]
    },
    {
      key: 'comp',
      title: '6. Time & Space Complexity',
      mins: 25,
      questions: [
        { question: 'Binary search runs in which worst-case time complexity?', options: ['O(n)', 'O(n^2)', 'O(log n)'], correctIndex: 2 },
        { question: 'What does Big-O notation represent?', options: ['Upper bound (worst-case growth rate)', 'Exact runtime in milliseconds', 'Lower bound only'], correctIndex: 0 },
        { question: 'Simplify O(3n^2 + 5n + 100):', options: ['O(3n^2)', 'O(n^2)', 'O(n^3)'], correctIndex: 1 },
        { question: 'Which complexity grows fastest as input n increases?', options: ['O(n log n)', 'O(n^2)', 'O(2^n)'], correctIndex: 2 },
        { question: 'What is the time complexity of Merge Sort in the worst case?', options: ['O(n log n)', 'O(n^2)', 'O(n)'], correctIndex: 0 },
        { question: 'What is auxiliary space complexity?', options: ['Extra memory used apart from input data', 'Total disk space', 'CPU cache size'], correctIndex: 0 },
        { question: 'A loop halving n each step (n = n / 2) has time complexity:', options: ['O(n)', 'O(log n)', 'O(sqrt(n))'], correctIndex: 1 },
        { question: 'What is the space complexity of an in-place sorting algorithm like Heap Sort?', options: ['O(1)', 'O(n)', 'O(log n)'], correctIndex: 0 },
        { question: 'Which notation denotes a tight bound (both upper and lower)?', options: ['Big-O (O)', 'Big-Omega (Ω)', 'Big-Theta (Θ)'], correctIndex: 2 },
        { question: 'What is the time complexity of generating all subsets of a set of size n?', options: ['O(n^2)', 'O(2^n)', 'O(n!)'], correctIndex: 1 }
      ]
    },
    {
      key: 'rec',
      title: '7. Recursion',
      mins: 30,
      questions: [
        { question: 'What prevents infinite recursion?', options: ['A valid base case', 'A global counter', 'A for loop'], correctIndex: 0 },
        { question: 'What error occurs when recursion depth exceeds call stack memory?', options: ['Stack Overflow', 'NullPointerException', 'SyntaxError'], correctIndex: 0 },
        { question: 'What is tail recursion?', options: ['Recursive call is the very last operation in the function', 'Recursion with two base cases', 'Recursion without parameters'], correctIndex: 0 },
        { question: 'What is the space complexity of recursive factorial(n)?', options: ['O(1)', 'O(n) due to call stack frames', 'O(log n)'], correctIndex: 1 },
        { question: 'In naive recursive Fibonacci fib(n), what is the time complexity?', options: ['O(n)', 'O(n^2)', 'O(2^n)'], correctIndex: 2 },
        { question: 'What is backtracking?', options: ['Exploring choices recursively and undoing invalid paths', 'Reversing a linked list', 'Sorting backwards'], correctIndex: 0 },
        { question: 'Every recursive algorithm can theoretically be rewritten using:', options: ['Iteration and an explicit stack', 'Only arrays', 'Only hash maps'], correctIndex: 0 },
        { question: 'Which problem is a classic example of Divide and Conquer recursion?', options: ['Merge Sort', 'Linear Search', 'Bubble Sort'], correctIndex: 0 },
        { question: 'In Tower of Hanoi with n disks, how many moves are required?', options: ['2^n - 1', 'n^2', '2n'], correctIndex: 0 },
        { question: 'What happens during the "unwinding" phase of recursion?', options: ['Stack frames pop and return values back to callers', 'New variables are allocated', 'Base case is skipped'], correctIndex: 0 }
      ]
    },
    {
      key: 'hash',
      title: '8. Hashing & Hash Maps',
      mins: 25,
      questions: [
        { question: 'What is the average-case lookup time in a Hash Map?', options: ['O(n)', 'O(1)', 'O(log n)'], correctIndex: 1 },
        { question: 'What is a hash collision?', options: ['Two distinct keys map to the same bucket index', 'A key is deleted twice', 'Map runs out of keys'], correctIndex: 0 },
        { question: 'Which technique resolves collisions by storing a linked list at each bucket?', options: ['Separate Chaining', 'Linear Probing', 'Double Hashing'], correctIndex: 0 },
        { question: 'What is the worst-case lookup time in a Hash Map if all keys collide?', options: ['O(1)', 'O(log n)', 'O(n)'], correctIndex: 2 },
        { question: 'What is Open Addressing in hash tables?', options: ['Finding another empty slot within the table array itself', 'Using external files', 'Allowing duplicate keys'], correctIndex: 0 },
        { question: 'What does the Load Factor (α = n / m) measure?', options: ['How full the hash table is', 'Key string length', 'Number of hash functions'], correctIndex: 0 },
        { question: 'When the load factor exceeds a threshold, what operation occurs?', options: ['Rehashing into a larger table', 'Deleting old keys', 'Converting to a tree'], correctIndex: 0 },
        { question: 'Which property MUST a good hash function satisfy?', options: ['Deterministic (same key always produces same hash)', 'Random output each call', 'Always returns prime numbers'], correctIndex: 0 },
        { question: 'Which data structure stores only unique keys with O(1) average lookup?', options: ['HashSet', 'Queue', 'Min-Heap'], correctIndex: 0 },
        { question: 'How is the Two-Sum problem solved in O(n) time?', options: ['Store seen numbers and indices in a Hash Map', 'Nested loops', 'Binary search'], correctIndex: 0 }
      ]
    },
    {
      key: 'll',
      title: '9. Linked Lists',
      mins: 30,
      questions: [
        { question: 'What does each node in a singly linked list contain?', options: ['Index and Data', 'Data and Next pointer', 'Two parent pointers'], correctIndex: 1 },
        { question: 'What is the time complexity to insert a node at the head of a linked list?', options: ['O(1)', 'O(n)', 'O(log n)'], correctIndex: 0 },
        { question: 'Why is random access by index O(n) in a linked list?', options: ['Must traverse sequentially from head', 'Nodes are sorted', 'Pointers are encrypted'], correctIndex: 0 },
        { question: 'Which algorithm detects a cycle in a linked list using O(1) space?', options: ['Floyd’s Tortoise and Hare (Slow/Fast pointers)', 'Dijkstra’s Algorithm', 'Kahn’s Algorithm'], correctIndex: 0 },
        { question: 'What extra pointer does a Doubly Linked List node have?', options: ['prev pointer', 'root pointer', 'random pointer'], correctIndex: 0 },
        { question: 'What does the next pointer of the tail node point to in a non-circular list?', options: ['null', 'head', 'itself'], correctIndex: 0 },
        { question: 'How do you find the middle node of a linked list in one pass?', options: ['Move fast pointer 2 steps and slow pointer 1 step', 'Count length first', 'Use a hash map'], correctIndex: 0 },
        { question: 'What is a sentinel (dummy) head node useful for?', options: ['Simplifying edge cases when inserting/deleting at the head', 'Sorting nodes', 'Compressing memory'], correctIndex: 0 },
        { question: 'In a Circular Linked List, what does the tail node point to?', options: ['The head node', 'null', 'undefined'], correctIndex: 0 },
        { question: 'What is the space complexity to reverse a singly linked list iteratively?', options: ['O(1)', 'O(n)', 'O(log n)'], correctIndex: 0 }
      ]
    },
    {
      key: 'sq',
      title: '10. Stacks & Queues',
      mins: 25,
      questions: [
        { question: 'Which ordering principle does a Stack follow?', options: ['FIFO', 'LIFO (Last In, First Out)', 'Priority order'], correctIndex: 1 },
        { question: 'Which ordering principle does a standard Queue follow?', options: ['FIFO (First In, First Out)', 'LIFO', 'Random order'], correctIndex: 0 },
        { question: 'Which data structure is best for checking balanced parentheses?', options: ['Stack', 'Queue', 'HashSet'], correctIndex: 0 },
        { question: 'Which graph traversal algorithm relies on a Queue?', options: ['Breadth-First Search (BFS)', 'Depth-First Search (DFS)', 'Topological DFS'], correctIndex: 0 },
        { question: 'What is the time complexity of push and pop on a stack?', options: ['O(1)', 'O(n)', 'O(log n)'], correctIndex: 0 },
        { question: 'What is a Deque?', options: ['Double-ended queue allowing insertion/removal at both ends', 'A deleted queue', 'A sorted stack'], correctIndex: 0 },
        { question: 'What is a Monotonic Stack used for?', options: ['Finding Next Greater/Smaller Element in O(n)', 'Sorting strings', 'Balancing binary trees'], correctIndex: 0 },
        { question: 'Why is a Circular Queue preferred over a simple array queue?', options: ['Reuses empty spaces left by dequeued elements', 'Uses less disk space', 'Sorts elements automatically'], correctIndex: 0 },
        { question: 'How many stacks are needed to implement a Queue?', options: ['2 stacks', '1 stack', '3 stacks'], correctIndex: 0 },
        { question: 'Which expression notation eliminates the need for parentheses and uses a stack to evaluate?', options: ['Postfix (Reverse Polish Notation)', 'Infix', 'Roman notation'], correctIndex: 0 }
      ]
    },
    {
      key: 'trees',
      title: '11. Trees & BST',
      mins: 40,
      questions: [
        { question: 'Inorder traversal of a Binary Search Tree (BST) visits nodes in which order?', options: ['Reverse order', 'Ascending sorted order', 'Level order'], correctIndex: 1 },
        { question: 'What is the BST invariant property for any node X?', options: ['Left subtree < X < Right subtree', 'Left subtree > X > Right subtree', 'All leaves at same depth'], correctIndex: 0 },
        { question: 'What is the average search time complexity in a balanced BST?', options: ['O(log n)', 'O(n)', 'O(1)'], correctIndex: 0 },
        { question: 'What is the worst-case search time in a skewed (unbalanced) BST?', options: ['O(log n)', 'O(n)', 'O(1)'], correctIndex: 1 },
        { question: 'Which traversal visits Root -> Left -> Right?', options: ['Preorder', 'Inorder', 'Postorder'], correctIndex: 0 },
        { question: 'Which traversal is best for deleting/freeing a tree from bottom up?', options: ['Postorder (Left -> Right -> Root)', 'Preorder', 'Inorder'], correctIndex: 0 },
        { question: 'What is the maximum number of nodes at level L (0-indexed) of a binary tree?', options: ['2^L', '2L', 'L^2'], correctIndex: 0 },
        { question: 'What is a leaf node?', options: ['A node with no children', 'The root node', 'A node with two children'], correctIndex: 0 },
        { question: 'Which self-balancing BST maintains height difference ≤ 1 at every node?', options: ['AVL Tree', 'Trie', 'Heap'], correctIndex: 0 },
        { question: 'Level-order traversal of a binary tree uses which auxiliary data structure?', options: ['Queue', 'Stack', 'Hash Map'], correctIndex: 0 }
      ]
    },
    {
      key: 'dp',
      title: '12. Dynamic Programming',
      mins: 45,
      questions: [
        { question: 'Which two properties must a problem have to apply Dynamic Programming?', options: ['Overlapping Subproblems & Optimal Substructure', 'Sorted Input & Unique Keys', 'Directed Cycles & Negative Weights'], correctIndex: 0 },
        { question: 'What is Memoization?', options: ['Top-down recursion with caching of solved subproblems', 'Bottom-up iteration', 'Greedy selection'], correctIndex: 0 },
        { question: 'What is Tabulation in DP?', options: ['Bottom-up iterative filling of a DP table', 'Top-down recursion', 'Random sampling'], correctIndex: 0 },
        { question: 'How does DP differ from Divide and Conquer?', options: ['DP subproblems overlap and are reused; D&C subproblems are independent', 'DP never uses arrays', 'D&C is always slower'], correctIndex: 0 },
        { question: 'What is the time complexity of 0/1 Knapsack with n items and capacity W?', options: ['O(n * W)', 'O(n + W)', 'O(2^n)'], correctIndex: 0 },
        { question: 'In Coin Change (minimum coins), what does dp[i] typically represent?', options: ['Minimum coins needed to make amount i', 'Maximum coin value', 'Number of coin types'], correctIndex: 0 },
        { question: 'What is the Longest Common Subsequence (LCS) time complexity for strings of length m and n?', options: ['O(m * n)', 'O(m + n)', 'O(log(m*n))'], correctIndex: 0 },
        { question: 'When can you optimize a 2D DP table down to a 1D array?', options: ['When current row depends only on the previous row', 'Never', 'Only for string problems'], correctIndex: 0 },
        { question: 'In Climbing Stairs (1 or 2 steps at a time), dp[n] equals:', options: ['dp[n-1] + dp[n-2]', 'dp[n-1] * 2', 'dp[n/2] + 1'], correctIndex: 0 },
        { question: 'Why is a greedy approach insufficient for 0/1 Knapsack?', options: ['Items cannot be broken into fractions, so local best may miss global optimum', 'Sorting takes too long', 'Weights can be zero'], correctIndex: 0 }
      ]
    }
  ];

  const created = {};
  for (const item of rawConcepts) {
    const doc = await Concept.create({
      courseId: course._id,
      title: item.title,
      description: `Core concepts, video lecture, and 10-question mastery assessment for ${item.title}.`,
      lessons: [
        {
          title: `${item.title} - Video Lecture`,
          type: 'video',
          urlOrContent: 'https://www.youtube.com/embed/8hly31xKli0',
          durationMins: item.mins
        }
      ],
      quiz: {
        passingScore: 70,
        questions: item.questions
      }
    });
    created[item.key] = doc._id;
  }

  // Build branching DAG edges (source -> target)
  const links = [
    ['vars', 'ctrl'],
    ['ctrl', 'loops'],
    ['ctrl', 'funcs'],
    ['loops', 'arrays'],
    ['loops', 'comp'],
    ['funcs', 'rec'],
    ['funcs', 'll'],
    ['comp', 'hash'],
    ['comp', 'll'],
    ['arrays', 'hash'],
    ['arrays', 'sq'],
    ['ll', 'sq'],
    ['rec', 'trees'],
    ['sq', 'trees'],
    ['rec', 'dp'],
    ['arrays', 'dp']
  ];

  course.edges = links.map(([src, tgt]) => ({
    source: created[src],
    target: created[tgt]
  }));
  await course.save();

  // Seed demo learner with first 2 concepts mastered
  await Progress.create({
    learnerId: 'demo-student',
    courseId: course._id,
    concepts: [
      { conceptId: created.vars, bestScore: 100, isMastered: true },
      { conceptId: created.ctrl, bestScore: 100, isMastered: true }
    ]
  });

  console.log('Seeded 12-concept DSA course with 10 questions per concept (120 total)!');
  process.exit();
};

seedData();