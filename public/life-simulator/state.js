let gameState = {};
let gameMessages = [];
let isGenerating = false;

let isGameHosting = false;
let isCreatorHosting = false;
let hostingController = null;

let creatorMessages = [];
let creatorState = {
  playerName: '',
  narrativeMode: 'second_person',
  worldName: '',
  worldType: '',
  worldTags: [],
  worldDesc: '',
  atmosphere: '',
  powerSystem: '',
  societyStructure: '',
  specialElement: '',
  playerBackground: '',
  storylines: {
    main: '',
    hidden: '',
    romance: ''
  },
  importantCharacters: {
    heroine: '',
    mentor: '',
    friend: '',
    enemy: '',
    rival: ''
  }
};
let isCreatorGenerating = false;
let creatorQuestionCount = 0;
const MAX_CREATOR_QUESTIONS = 8;

function initNewGameState() {
  return {
    worldId: 'world_' + Date.now(),
    worldName: '未知世界',
    worldDesc: '',
    worldType: 'new',
    worldTags: [],
    storylines: {
      main: '',
      hidden: '',
      romance: ''
    },
    importantCharacters: {
      heroine: '',
      mentor: '',
      friend: '',
      enemy: '',
      rival: ''
    },
    turn: 0,
    age: 0,
    isDead: false,
    characterStatus: '',
    worldRules: '',
    builder: '',
    playerName: '',
    narrativeMode: 'second_person',
  };
}

function initWorldCreator() {
  creatorMessages = [];
  creatorState = {
    playerName: '',
    narrativeMode: 'second_person',
    worldName: '',
    worldType: '',
    worldTags: [],
    worldDesc: '',
    atmosphere: '',
    powerSystem: '',
    societyStructure: '',
    specialElement: '',
    playerBackground: '',
    storylines: {
      main: '',
      hidden: '',
      romance: ''
    },
    importantCharacters: {
      heroine: '',
      mentor: '',
      friend: '',
      enemy: '',
      rival: ''
    }
  };
  creatorQuestionCount = 0;
  isCreatorGenerating = false;
}

window.LifeSimulator = window.LifeSimulator || {};
window.LifeSimulator.gameState = gameState;
window.LifeSimulator.gameMessages = gameMessages;
window.LifeSimulator.isGenerating = isGenerating;
window.LifeSimulator.isGameHosting = isGameHosting;
window.LifeSimulator.isCreatorHosting = isCreatorHosting;
window.LifeSimulator.hostingController = hostingController;
window.LifeSimulator.creatorMessages = creatorMessages;
window.LifeSimulator.creatorState = creatorState;
window.LifeSimulator.isCreatorGenerating = isCreatorGenerating;
window.LifeSimulator.creatorQuestionCount = creatorQuestionCount;
window.LifeSimulator.MAX_CREATOR_QUESTIONS = MAX_CREATOR_QUESTIONS;
window.LifeSimulator.initNewGameState = initNewGameState;
window.LifeSimulator.initWorldCreator = initWorldCreator;
