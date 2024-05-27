function useLocalSearchParams() {
  return {};
}

///// fixture above

const { date = null } = useLocalSearchParams();

const selectedDate = JSON.parse(date); // Noncompliant
