const Dashboard = () => {
  const tasks = [undefined];

  return (
    <>
      {/* ... */}
      <div className="bg-white min-h-screen p-20">
        <div className="bg-slate-100 p-4 rounded-lg shadow-md">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="text-left text-gray-600 w-1/6">Contract</th>
                <th className="text-left text-gray-600 w-1/6">Name</th>
                <th className="text-left text-gray-600 w-1/6">Amount</th>
                <th className="text-left text-gray-600 w-1/6">Submission Deadline</th>
                <th className="text-left text-gray-600 w-1/6">Review Deadline</th>
                <th className="text-left text-gray-600 w-1/6">Payment Deadline</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500">No contracts available.</td>
                  <td colSpan={6} className="text-center text-gray-500">No contracts available.</td>
                </tr>
              ) : (
                tasks.map((task, index) => (
                  <tr
                    key={index}
                    className="h-[50px] hover:shadow-lg duration-300"
                    onClick={() => router.push(`/taskDetails/${task.id}`)}
                  >
                    <td>{task.title}</td> {/* Noncompliant: task can be undefined */}
                    <td>{task.recipientName}</td> {/* Noncompliant: task can be undefined */}
                    <td>{task.rewardAmount} {task.symbol}</td> {/* Noncompliant: task can be undefined */}
                    <td>{task.submissionDeadline.toDateString()}</td> {/* Noncompliant: task can be undefined */}
                    <td>{task.reviewDeadline.toDateString()}</td> {/* Noncompliant: task can be undefined */}
                    <td>{task.paymentDeadline.toDateString()}</td> {/* Noncompliant: task can be undefined */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};


export default Dashboard;
