const fs = require("fs");
const path = require("path");
const appConfig = require("../config/app");

const projectRoot = path.join(__dirname, "..");
const foodsFile = path.join(projectRoot, "data", "foods.json");
const webpFolder = path.join(projectRoot, "public", "images", "foods", "webp");

const validCategories = appConfig.validCategories;
const categoryLabelExceptions = appConfig.categoryLabelExceptions;

const requiredFields = ["id", "name", "category", "categoryLabel", "image", "explanation"];

function validateFoods() {
  const errors = [];
  const foods = readFoods(errors);

  if (!foods) {
    printResults(errors);
    process.exit(1);
  }

  const seenIds = new Set();
  const seenImages = new Set();

  foods.forEach((food, index) => {
    const label = food.id || food.name || `item at index ${index}`;

    requiredFields.forEach((field) => {
      if (!food[field]) {
        errors.push(`${label}: missing required field "${field}".`);
      }
    });

    if (food.id) {
      if (seenIds.has(food.id)) {
        errors.push(`${label}: duplicate id "${food.id}".`);
      }

      seenIds.add(food.id);
    }

    if (food.image) {
      if (seenImages.has(food.image)) {
        errors.push(`${label}: duplicate image path "${food.image}".`);
      }

      seenImages.add(food.image);
      validateImagePath(food, label, errors);
    }

    validateCategory(food, label, errors);
  });

  validateWebpCoverage(foods, errors);
  printResults(errors, foods.length);

  if (errors.length > 0) {
    process.exit(1);
  }
}

function readFoods(errors) {
  try {
    return JSON.parse(fs.readFileSync(foodsFile, "utf8"));
  } catch (error) {
    errors.push(`Could not read or parse data/foods.json: ${error.message}`);
    return null;
  }
}

function validateCategory(food, label, errors) {
  if (!food.category) {
    return;
  }

  if (!validCategories[food.category]) {
    errors.push(
      `${label}: category must be one of ${Object.keys(validCategories).join(", ")}.`,
    );
    return;
  }

  const expectedLabel = categoryLabelExceptions[food.id] || validCategories[food.category];

  if (food.categoryLabel !== expectedLabel) {
    errors.push(`${label}: categoryLabel should be "${expectedLabel}".`);
  }
}

function validateImagePath(food, label, errors) {
  if (!food.image.startsWith("/images/foods/webp/")) {
    errors.push(`${label}: image should start with "/images/foods/webp/".`);
  }

  if (!food.image.endsWith(".webp")) {
    errors.push(`${label}: image should point to a .webp file.`);
  }

  const imageFile = path.join(projectRoot, "public", food.image);

  if (!fs.existsSync(imageFile)) {
    errors.push(`${label}: image file does not exist at public${food.image}.`);
  }
}

function validateWebpCoverage(foods, errors) {
  let webpFiles = [];

  try {
    webpFiles = fs.readdirSync(webpFolder).filter((fileName) => fileName.endsWith(".webp"));
  } catch (error) {
    errors.push(`Could not read public/images/foods/webp: ${error.message}`);
    return;
  }

  const foodImageFiles = new Set(foods.map((food) => path.basename(food.image || "")));

  webpFiles.forEach((fileName) => {
    if (!foodImageFiles.has(fileName)) {
      errors.push(`${fileName}: webp image exists but is not listed in data/foods.json.`);
    }
  });
}

function printResults(errors, foodCount = 0) {
  if (errors.length === 0) {
    console.log(`Food data looks good (${foodCount} items).`);
    return;
  }

  console.error("Food data validation failed:");

  errors.forEach((error) => {
    console.error(`- ${error}`);
  });
}

validateFoods();
