@Injectable()
class UserService {
  ngOnInit() { // Noncompliant
    this.loadUsers();
  }
}
