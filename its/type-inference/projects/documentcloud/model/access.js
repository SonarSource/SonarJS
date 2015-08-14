// Keep this file in sync with lib/dc/access.rb

dc.access = {

  DELETED       : 0,   // The document was deleted, and will be removed soon.
  PRIVATE       : 1,   // The document is only visible to it's owner.
  ORGANIZATION  : 2,   // Visible to both the owner and her organization.
  EXCLUSIVE     : 3,   // Published, but exclusive to the owner's organization.
  PUBLIC        : 4,   // Free and public to all.
  PENDING       : 5,   // The document is being processed (acts as disabled).
  INVISIBLE     : 6,   // The document has been taken down (perhaps temporary).
  ERROR         : 7,   // The document is broken, or failed to import.

  // The inverse mapping, from access levels back to strings.
  NAMES : {
    0 : 'deleted',
    1 : 'private',
    2 : 'organization',
    3 : 'exclusive',
    4 : 'public',
    5 : 'pending',
    6 : 'invisible',
    7 : 'error'
  }

};