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
                if(typeof item === "object" && item !== null && "x" in item){
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
