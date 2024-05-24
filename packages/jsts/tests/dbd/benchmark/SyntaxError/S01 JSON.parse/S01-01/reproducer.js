function useLocalSearchParams() {
  return {};
}

///// fixture above

const { date } = useLocalSearchParams();

const selectedDate = JSON.parse(date); // Noncompliant
