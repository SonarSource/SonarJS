export {};

class Schema {
  catch(defaultValue: number): this {
    return this;
  }
}

const schema = new Schema();
schema.catch(0);
