export class Helpers {
  // Convert the string to all lowercase
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
}
