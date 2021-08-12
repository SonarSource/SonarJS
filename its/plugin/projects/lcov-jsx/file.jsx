import React from 'react'

const Test = ({ condition }) => (
  <div>
    {condition && <span>Test1</span>}

    <span>Test2</span>
  </div>
)

export default Test
