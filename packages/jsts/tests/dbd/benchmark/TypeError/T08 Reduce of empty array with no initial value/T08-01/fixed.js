"use strict";

const savedRecipes = [];

const printSavedIngredients = (listOfRecipes) => {
  const savedIngredients = listOfRecipes.reduce((acc, currentValue) =>
    acc.concat(currentValue)
  );
  return savedIngredients;
};

const displayMenu = () => {
  console.log("---------------------------------------------------");
  console.log("---Recipe Management System Menu:               ---");
  console.log("---1. Show All Authors                          ---");
  console.log("---2. Show Recipe names by Author               ---");
  console.log("---3. Show Recipe names by Ingredient           ---");
  console.log("---4. Get Recipe by Name                        ---");
  console.log("---5. Get All Ingredients of Saved Recipes      ---");
  console.log("---0. Exit                                      ---");
  const choice = prompt("---Enter a number (1-5) or 0 to exit:    ");
  console.log("---------------------------------------------------");
  return parseInt(choice);
};

let alreadyCalled = false
function prompt() {
  if (! alreadyCalled) {
    alreadyCalled = true;
    return '5'
  }
  return '0'
 }

let choice;

do {
  choice = displayMenu();

  switch (choice) {

    case 5:
      // Choose this option to view a list of ingredients from the saved recipes.
      // The program will display the ingredient list from all the saved recipes.

      if (savedRecipes.length === 0) {
        console.log("No saved ingredients.");
        console.log("if you like to save the ingredients of a recipe, press: 4.")
      } else {
        const savedIngredients = printSavedIngredients(savedRecipes);
        console.log("Saved Ingredients:", savedIngredients);


      }

      break;

    case 0:
      console.log("Exiting...");
      break;

    default:
      console.log("Invalid input. Please enter a number between 0 and 5.");
  }
} while (choice !== 0);
