// originally, this was TS

//const scrubX = (data: any) => {
    const scrubX = (data) => {
        const blackboard = JSON.parse(JSON.stringify(data));

        //let labels: string[] = [];
        let labels = [];
        if(Array.isArray(data)){
            // console.log("not grouped");
            // Not grouped
            blackboard.forEach((item, x) => {
                if(typeof item === "object" && "x" in item){ // Noncompliant: item can be null
                    labels.push(item.x);
                    item.x = x;
                }
            });
            return {labels, data: blackboard};

        }else{
            // Grouped

        }
      }

      scrubX([null])
