// S6583: no-mixed-enums — enum has mixed member types
enum Status {
  Active = 0,
  Inactive = 'inactive', // Noncompliant: mixing number and string values
}
