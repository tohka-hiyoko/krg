import groupBy from "lodash.groupby";
import keyBy from "lodash.keyby";
import uniq from "lodash.uniq";
import zip from "lodash.zip";
import RecipeItem, {TYPES} from "./RecipeItem";
import Recipe from "./Recipe";

export default class RecipeData {
  constructor(items) {
    this._items = items.map((d) => new RecipeItem(d));
    this._nameTable = keyBy(this._items, (item) => item.name);
    this._categories = uniq(this._items.map((item) => item.category));
    this._categoryTable = groupBy(this._items, "category");
  }
  get items() {
    return this._items;
  }
  get categories() {
    return this._categories;
  }
  getItemByName(itemName) {
    return this._nameTable[itemName];
  }
  getItemsByCategory(category) {
    return this._categoryTable[category];
  }
  generateRecipes(targetItems) {
    const specialType = this.generateSpecialType(targetItems);
    if (specialType === null) {
      return [];
    }

    const possibleTypes = this.generatePossibleTypes(targetItems);
    const baseRecipe = this.generateBaseRecipe(targetItems);
    const recipes = [];

    possibleTypes.forEach(([secretaryType, materielType]) => {
      const recipe = this.generateMaterielRecipe(baseRecipe, materielType);
      const resultItems = [];
      const restItems = [];

      if (recipe === null) {
        return;
      }

      this._items.forEach((item) => {
        const result = item.results[secretaryType][materielType][specialType];
        if (!result.canDevelop()) {
          return;
        }
        const recipeResult = zip(recipe, item.recipe).every(([a, b]) => a >= b);
        (recipeResult ? resultItems : restItems).push({
          data: item,
          result: result,
          target: targetItems.some((i) => i.name === item.name),
        });
      });

      recipes.push(
        new Recipe({
          secretaryType,
          materielType,
          specialType,
          recipe,
          resultItems,
          restItems,
        })
      );
    });

    return recipes;
  }
  generateSpecialType(targetItems) {
    let specialType = "general";
    for (const item of targetItems) {
      const t = item.specialType;
      if (t !== "general") {
        if (specialType !== "general" && specialType !== t) {
          return null;
        }
        specialType = t;
      }
    }
    return specialType;
  }
  generatePossibleTypes(targetItems) {
    const specialType = this.generateSpecialType(targetItems);
    if (specialType === null) {
      return [];
    }

    let possibleTypes = TYPES;
    targetItems.forEach((item) => {
      TYPES.forEach(([secretaryType, materielType]) => {
        const result = item.results[secretaryType][materielType][specialType];

        if (!result.canDevelop()) {
          possibleTypes = possibleTypes.filter(
            (t) => !(t[0] === secretaryType && t[1] === materielType)
          );
        }
      });
    });
    return possibleTypes;
  }
  generateBaseRecipe(targetItems) {
    return zip(...targetItems.map((item) => item.recipe)).map((a) =>
      Math.max(...a)
    );
  }
  generateMaterielRecipe(baseRecipe, materielType) {
    const recipe = baseRecipe.concat();

    if (materielType === "??????(??????)") {
      const max = Math.max(...recipe);

      if (recipe[0] < max && recipe[2] < max) {
        recipe[2] = max;
      }
    } else if (materielType === "??????") {
      if (recipe[1] < recipe[3]) {
        recipe[1] = recipe[3];
      }

      const max = Math.max(recipe[0], recipe[2]);

      if (recipe[1] <= max) {
        recipe[1] = max + 1;
      }
    } else if (materielType === "?????????") {
      const max = Math.max(recipe[0], recipe[1], recipe[2]);

      if (recipe[3] <= max) {
        recipe[3] = max + 1;
      }
    } else {
      throw new Error("materielType");
    }

    if (Math.max(...recipe) > 300) {
      return null;
    } else {
      return recipe;
    }
  }
}
