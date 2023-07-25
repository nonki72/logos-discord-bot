import 'dotenv/config';
import { getRPSChoices } from './game.js';
import { capitalize, InstallGlobalCommands } from './utils.js';

// Get the game choices from game.js
function createCommandChoices() {
  const choices = getRPSChoices();
  const commandChoices = [];

  for (let choice of choices) {
    commandChoices.push({
      name: capitalize(choice),
      value: choice.toLowerCase(),
    });
  }

  return commandChoices;
}

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
};

const TALK_COMMAND = {
  name: 'talk',
  description: 'Miku speaks',
  type: 1,
};

const ALL_COMMANDS = [TEST_COMMAND, TALK_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
