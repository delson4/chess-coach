// Each coach is a chess piece character with a unique personality.
// All coaches use Stockfish at max strength for commentary analysis,
// regardless of what ELO level the bot is playing at.

const coaches = [
  {
    id: 'king',
    name: 'King Magnus',
    piece: '\u2654',
    pieceBlack: '\u265A',
    color: '#D4AF37',
    tagline: 'Wise & measured',
    description: 'A regal strategist who speaks with authority. Calm under pressure, always thinking three steps ahead.',
    style: 'formal',
    greetings: [
      "A fine day for a royal match. Let us begin.",
      "I shall guide you with the wisdom of ages.",
      "Every great king knows when to strike and when to wait."
    ],
    moveTemplates: {
      brilliant: [
        "Masterful! A move worthy of royalty.",
        "Excellent judgment. You see the board clearly.",
        "That is precisely the move I would have chosen."
      ],
      good: [
        "A sound decision. The position improves.",
        "Well played. Your strategy develops nicely.",
        "A reasonable move. The kingdom is secure."
      ],
      inaccuracy: [
        "Hmm, there may have been a stronger path forward.",
        "Not a blunder, but a king must aim for perfection.",
        "Consider the consequences more carefully next time."
      ],
      mistake: [
        "That was an oversight. Stay vigilant.",
        "Even kings make errors. Learn from this.",
        "That move weakens your position. Be more careful."
      ],
      blunder: [
        "A grave error! You must recover quickly.",
        "That was a serious misstep. Focus your mind.",
        "The position has turned dire. Steel yourself."
      ],
      botMove: [
        "I advance with purpose.",
        "My move carries a deeper plan.",
        "Watch carefully \u2014 this is deliberate."
      ]
    }
  },
  {
    id: 'queen',
    name: 'Queen Valentina',
    piece: '\u2655',
    pieceBlack: '\u265B',
    color: '#9B59B6',
    tagline: 'Bold & aggressive',
    description: 'Fierce and direct. She commands the board with relentless attacks and sharp tactical vision.',
    style: 'aggressive',
    greetings: [
      "Ready to crush some opposition? Let's go!",
      "I don't do draws. Let's win this.",
      "Time to dominate the board."
    ],
    moveTemplates: {
      brilliant: [
        "YES! That's a killer move!",
        "Devastating! I love the aggression!",
        "Now THAT is how you play chess!"
      ],
      good: [
        "Solid. Keep the pressure on.",
        "Good move. Now don't let up!",
        "That works. Push the attack!"
      ],
      inaccuracy: [
        "Eh, you're being too passive there.",
        "Come on, there was something sharper!",
        "Don't play it safe. Attack!"
      ],
      mistake: [
        "Ugh, that was sloppy. Pick it up!",
        "You're giving away your advantage!",
        "That hurt. Don't let it happen again."
      ],
      blunder: [
        "What was THAT?! Focus!",
        "Disaster! You just handed the game away!",
        "That was terrible. Time to fight for survival."
      ],
      botMove: [
        "Coming for you!",
        "Feel the pressure yet?",
        "I'm not holding back."
      ]
    }
  },
  {
    id: 'bishop',
    name: 'Bishop Benedikt',
    piece: '\u2657',
    pieceBlack: '\u265D',
    color: '#27AE60',
    tagline: 'Philosophical & patient',
    description: 'Sees the game from unique angles. Loves long diagonals and deep positional understanding.',
    style: 'philosophical',
    greetings: [
      "Every game is a journey of discovery. Shall we begin?",
      "The diagonal reveals truth. Let me show you.",
      "Patience and angles \u2014 that's how we win."
    ],
    moveTemplates: {
      brilliant: [
        "Beautiful! You see the geometry of the position.",
        "Wonderfully calculated. The lines are in your favor.",
        "A move of deep understanding."
      ],
      good: [
        "A harmonious choice. The pieces work together.",
        "Good. Your position flows naturally from here.",
        "A balanced move. Patience rewards."
      ],
      inaccuracy: [
        "Interesting, but consider the longer diagonal view.",
        "There's a deeper truth in this position you might have missed.",
        "Sometimes the indirect path is the strongest."
      ],
      mistake: [
        "That disrupts the harmony of your position.",
        "A misstep on the path. Realign your pieces.",
        "The geometry has shifted against you."
      ],
      blunder: [
        "The angles have all collapsed. This is serious.",
        "A fundamental misreading of the position.",
        "That move contradicts every principle. Recover."
      ],
      botMove: [
        "I move along the lines of truth.",
        "Consider the angle of this move carefully.",
        "There's a deeper purpose here."
      ]
    }
  },
  {
    id: 'knight',
    name: 'Sir Gallop',
    piece: '\u2658',
    pieceBlack: '\u265E',
    color: '#E67E22',
    tagline: 'Tricky & unpredictable',
    description: 'Loves forks, tricks, and surprise attacks. Never takes the obvious path.',
    style: 'playful',
    greetings: [
      "Haha! Ready for some tricks? Let's play!",
      "You never know where I'll jump next!",
      "Forks, skewers, and chaos \u2014 my specialty!"
    ],
    moveTemplates: {
      brilliant: [
        "Ohhh nice trick! I didn't see that coming!",
        "Sneaky! I love it! Great tactic!",
        "Ha! That was a tricky one! Well found!"
      ],
      good: [
        "Hop hop! Good move, keep it going!",
        "Not bad! Setting up something sneaky?",
        "Good one! I like where this is going!"
      ],
      inaccuracy: [
        "Hmm, there was a trickier move hiding there!",
        "You missed a chance to be sneaky!",
        "Too straightforward! Think like a knight!"
      ],
      mistake: [
        "Oops! That's gonna cost you!",
        "Ah no, you fell into a trap there!",
        "That's not great \u2014 watch out for tricks!"
      ],
      blunder: [
        "OH NO! That was a huge blunder!",
        "Yikes! Everything is falling apart!",
        "Big oof! That's a game-changer, and not the good kind!"
      ],
      botMove: [
        "Bet you didn't expect that!",
        "Surprise! Try to figure out my plan!",
        "Hehe, watch this!"
      ]
    }
  },
  {
    id: 'rook',
    name: 'Castle',
    piece: '\u2656',
    pieceBlack: '\u265C',
    color: '#2980B9',
    tagline: 'Solid & practical',
    description: 'Strong, reliable, and no-nonsense. Believes in solid foundations and open files.',
    style: 'practical',
    greetings: [
      "Let's play solid chess. No fancy stuff.",
      "Good fundamentals win games. Ready?",
      "Build a fortress, then attack. That's the way."
    ],
    moveTemplates: {
      brilliant: [
        "That's a strong move. Very efficient.",
        "Well done. That's textbook technique.",
        "Excellent. Maximum effect, minimum waste."
      ],
      good: [
        "Solid. That's the right idea.",
        "Good move. Keep building your position.",
        "Practical choice. Can't go wrong with that."
      ],
      inaccuracy: [
        "There was something more concrete available.",
        "Decent, but you could've been more direct.",
        "That's okay, but think about open lines."
      ],
      mistake: [
        "That's a structural weakness. Be careful.",
        "Your foundation is cracking. Shore it up.",
        "That loosens your position too much."
      ],
      blunder: [
        "That's a collapse. Your position is crumbling.",
        "Serious structural damage. Tough to recover.",
        "That was a load-bearing move, and it failed."
      ],
      botMove: [
        "Building my position brick by brick.",
        "That's a solid move. Deal with it.",
        "Steady progress."
      ]
    }
  },
  {
    id: 'pawn',
    name: 'Pawnathan',
    piece: '\u2659',
    pieceBlack: '\u265F',
    color: '#E74C3C',
    tagline: 'Humble & encouraging',
    description: 'Small but mighty! An encouraging underdog who believes every player can improve.',
    style: 'encouraging',
    greetings: [
      "Hey! I might be small, but I've got big advice!",
      "Every master was once a beginner. Let's do this!",
      "One step at a time \u2014 that's how we promote!"
    ],
    moveTemplates: {
      brilliant: [
        "WOW! That was amazing! You're getting so good!",
        "I'm so proud of that move! Incredible!",
        "See?! You're better than you think! Brilliant!"
      ],
      good: [
        "Nice move! You're doing great!",
        "Ooh, that's a good one! Keep it up!",
        "You're improving with every game! Great move!"
      ],
      inaccuracy: [
        "Good try! There might've been something even better though.",
        "Not bad at all! But next time, look a little deeper.",
        "Hey, no worries! We learn from every move!"
      ],
      mistake: [
        "Oops! That's okay, we all make mistakes!",
        "Don't worry about that one. Let's focus on the next move!",
        "Hey, it happens! The important thing is what you do next!"
      ],
      blunder: [
        "Oh no! But hey, comebacks are the best stories!",
        "That stings, but don't give up! Anything can happen!",
        "Tough break, but every master has blundered. Keep going!"
      ],
      botMove: [
        "Here's my move! Don't worry, you can handle it!",
        "I'm trying my best too!",
        "One step forward for me!"
      ]
    }
  }
];

export default coaches;
