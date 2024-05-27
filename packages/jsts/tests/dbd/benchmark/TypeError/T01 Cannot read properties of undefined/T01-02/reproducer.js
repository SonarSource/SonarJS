"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("preact/jsx-runtime");
const Dashboard = () => {
  const tasks = [undefined];
  return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {
    children: (0, jsx_runtime_1.jsx)("div", {
      className: "bg-white min-h-screen p-20",
      children: (0, jsx_runtime_1.jsx)("div", {
        className: "bg-slate-100 p-4 rounded-lg shadow-md",
        children: (0, jsx_runtime_1.jsxs)("table", {
          className: "min-w-full",
          children: [
            (0, jsx_runtime_1.jsx)("thead", {
              children: (0, jsx_runtime_1.jsxs)("tr", {
                children: [
                  (0, jsx_runtime_1.jsx)("th", {
                    className: "text-left text-gray-600 w-1/6",
                    children: "Contract",
                  }),
                  (0, jsx_runtime_1.jsx)("th", {
                    className: "text-left text-gray-600 w-1/6",
                    children: "Name",
                  }),
                  (0, jsx_runtime_1.jsx)("th", {
                    className: "text-left text-gray-600 w-1/6",
                    children: "Amount",
                  }),
                  (0, jsx_runtime_1.jsx)("th", {
                    className: "text-left text-gray-600 w-1/6",
                    children: "Submission Deadline",
                  }),
                  (0, jsx_runtime_1.jsx)("th", {
                    className: "text-left text-gray-600 w-1/6",
                    children: "Review Deadline",
                  }),
                  (0, jsx_runtime_1.jsx)("th", {
                    className: "text-left text-gray-600 w-1/6",
                    children: "Payment Deadline",
                  }),
                ],
              }),
            }),
            (0, jsx_runtime_1.jsx)("tbody", {
              children:
                tasks.length === 0
                  ? (0, jsx_runtime_1.jsxs)("tr", {
                      children: [
                        (0, jsx_runtime_1.jsx)("td", {
                          colSpan: 5,
                          className: "text-center text-gray-500",
                          children: "No contracts available.",
                        }),
                        (0, jsx_runtime_1.jsx)("td", {
                          colSpan: 6,
                          className: "text-center text-gray-500",
                          children: "No contracts available.",
                        }),
                      ],
                    })
                  : tasks.map((task, index) =>
                      (0, jsx_runtime_1.jsxs)(
                        "tr",
                        {
                          className: "h-[50px] hover:shadow-lg duration-300",
                          onClick: () => router.push(`/taskDetails/${task.id}`),
                          children: [
                            (0, jsx_runtime_1.jsx)("td", {
                              children: task.title,
                            }),
                            " ",
                            (0, jsx_runtime_1.jsx)("td", {
                              children: task.recipientName,
                            }),
                            " ",
                            (0, jsx_runtime_1.jsxs)("td", {
                              children: [task.rewardAmount, " ", task.symbol],
                            }),
                            " ",
                            (0, jsx_runtime_1.jsx)("td", {
                              children: task.submissionDeadline.toDateString(),
                            }),
                            " ",
                            (0, jsx_runtime_1.jsx)("td", {
                              children: task.reviewDeadline.toDateString(),
                            }),
                            " ",
                            (0, jsx_runtime_1.jsx)("td", {
                              children: task.paymentDeadline.toDateString(),
                            }),
                            " ",
                          ],
                        },
                        index
                      )
                    ),
            }),
          ],
        }),
      }),
    }),
  });
};
exports.default = Dashboard;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwcm9kdWNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlcHJvZHVjZXIuanN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLE1BQU0sU0FBUyxHQUFHLEdBQUcsRUFBRTtJQUNyQixNQUFNLEtBQUssR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBRTFCLE9BQU8sQ0FDTCwyREFFRSxnQ0FBSyxTQUFTLEVBQUMsNEJBQTRCLFlBQ3pDLGdDQUFLLFNBQVMsRUFBQyx1Q0FBdUMsWUFDcEQsbUNBQU8sU0FBUyxFQUFDLFlBQVksYUFDM0IsNENBQ0UsMkNBQ0UsK0JBQUksU0FBUyxFQUFDLCtCQUErQix5QkFBYyxFQUMzRCwrQkFBSSxTQUFTLEVBQUMsK0JBQStCLHFCQUFVLEVBQ3ZELCtCQUFJLFNBQVMsRUFBQywrQkFBK0IsdUJBQVksRUFDekQsK0JBQUksU0FBUyxFQUFDLCtCQUErQixvQ0FBeUIsRUFDdEUsK0JBQUksU0FBUyxFQUFDLCtCQUErQixnQ0FBcUIsRUFDbEUsK0JBQUksU0FBUyxFQUFDLCtCQUErQixpQ0FBc0IsSUFDaEUsR0FDQyxFQUNSLDRDQUNHLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUNwQiwyQ0FDRSwrQkFBSSxPQUFPLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBQywyQkFBMkIsd0NBQTZCLEVBQ2xGLCtCQUFJLE9BQU8sRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFDLDJCQUEyQix3Q0FBNkIsSUFDL0UsQ0FDTixDQUFDLENBQUMsQ0FBQyxDQUNGLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUN6QixnQ0FFRSxTQUFTLEVBQUMsdUNBQXVDLEVBQ2pELE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsYUFFckQseUNBQUssSUFBSSxDQUFDLEtBQUssR0FBTSxPQUNyQix5Q0FBSyxJQUFJLENBQUMsYUFBYSxHQUFNLE9BQzdCLDJDQUFLLElBQUksQ0FBQyxZQUFZLE9BQUcsSUFBSSxDQUFDLE1BQU0sSUFBTSxPQUMxQyx5Q0FBSyxJQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxFQUFFLEdBQU0sT0FDakQseUNBQUssSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsR0FBTSxPQUM3Qyx5Q0FBSyxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxHQUFNLFVBVHpDLEtBQUssQ0FnQlAsQ0FDTixDQUFDLENBQ0gsR0FDSyxJQUNGLEdBQ0osR0FDRixHQUNMLENBQ0osQ0FBQztBQUNKLENBQUMsQ0FBQztBQUdGLGtCQUFlLFNBQVMsQ0FBQyJ9
