async function authorize(req, res) {
  const { email, password, phoneNumber } = req.body;

  email = email || null; // Noncompliant: email is const
  phoneNumber = phoneNumber || null; // Noncompliant
  if (!email && !phoneNumber) return res.status(400).json({ error: "Both email and phone number cannot be empty" });
  if (!password) return res.status(400).json({ error: "Password cannot be empty" });

  let user = await User.findOne({
    where: {
      [Op.or]: [
        { email },
        { phoneNumber }
      ]
    }
  });
  if (user) {
    const token = jwt.sign(user.id);
    return res.status(200).json({ token: token });
  }
  else {
    return res.status(401).json({ error: "Incorrect credentials" });
  }
}

const fixture = { body: {} };

(async () => {
  await authorize(fixture);
})();
