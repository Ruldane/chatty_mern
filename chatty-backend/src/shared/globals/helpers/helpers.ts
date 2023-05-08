export class Helpers {
  /**
   * Converts the first letter of each word in the given string to uppercase
   * and the rest of the letters to lowercase.
   *
   * @param str The string to transform.
   * @returns The transformed string.
   */
  static firstLetterUpperCase(str: string): string {
    const valueString = str.toLowerCase();
    // Split the string into an array of letters
    return (
      valueString
        .split('')
        .map((value: string) => {
          // Convert the first letter to uppercase
          return `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}`;
        })
        // Join the array back into a string
        .join('')
    );
  }

  /**
   * Returns the string in lowercase
   * @param str The string to convert
   */
  static loverCase(str: string): string {
    return str.toLowerCase();
  }

  /**
   * Generate a random integer of length integerLength
   * @param integerLength length of the integer to be generated
   * @returns {number} random integer
   */
  static generateRandomIntegers(integerLength: number): number {
    const characters = '0123456789';
    let result = '';
    for (let i = 0; i < integerLength; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return parseInt(result, 10);
  }

  /**
   * Parses a JSON string and returns a JavaScript object or the JSON string
   * @param json The JSON string to parse.
   * @returns The JavaScript object or the JSON string.
   */
  static parseJson(json: string): any {
    try {
      return JSON.parse(json);
    } catch (error) {
      return json;
    }
  }

  /**
   * Checks if the given string is a valid data URL or not.
   *
   * A data URL is a URI scheme that allows including data in-line in web pages as if they were external resources.
   * For further information on data URL scheme, see https://en.wikipedia.org/wiki/Data_URI_scheme
   *
   * @param value The string to check.
   * @return {boolean} true if the string is a valid data URL; false otherwise.
   */
  static isDataUrl(value: string): boolean {
    // Regular expression to match data urls
    const dataUrlRegex = /^\s*data:([a-z]+\/[a-z0-9-+.]+(;[a-z-]+=[a-z0-9-]+)?)?(;base64)?,([a-z0-9!$&',()*+;=\-._~:@\\/?%\s]*)\s*$/i;
    // Test if the given string matches the data URL pattern
    return dataUrlRegex.test(value);
  }
}
