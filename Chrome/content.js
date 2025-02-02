chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  var whiteBoard = document.querySelector("#whiteboard");

  if (message.action === "startWhiteBoard") {
    if (!whiteBoard) {
      // Call the startWhiteboard function to create the whiteboard
      startWhiteboard();
    } else {
      document.querySelector("#whiteBoardToggleButton").remove();
      whiteBoard.remove();
    }
    return true;
  }
});

//save the canvas as a image
function saveCanvas() {
  const canvas = document.querySelector("canvas");
  if (canvas) {
    // Save with the whiteboard background
    const dataURL = canvas.toDataURL("image/png");
    downloadImage(dataURL, "glassboard.png");
  } else {
    console.error("Canvas not found!");
  }
}
//to download the saved image automatically
async function downloadImage(dataUrl, filename) {
  // Convert the data URL to a Blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  // Create a file handle using the File System Access API
  const options = {
    types: [
      {
        description: "PNG Image",
        accept: { "image/png": [".png"] },
      },
    ],
  };

  try {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: filename,
      ...options,
    });

    // Write the Blob to the chosen file
    const writableStream = await fileHandle.createWritable();
    await writableStream.write(blob);
    await writableStream.close();

    console.log("Image saved successfully!");
  } catch (error) {
    console.log("User canceled save operation or an error occurred: ", error);
  }
}

var startWhiteboard = function () {
  // Function to initialize and show the whiteboard
  function createWhiteboard() {
    // Create the whiteboard container
    const whiteboardDiv = document.createElement("div");
    whiteboardDiv.id = "whiteboard";
    whiteboardDiv.style.position = "fixed";
    whiteboardDiv.style.top = "0%"; // Set top to 8%
    whiteboardDiv.style.left = "0.5%";
    whiteboardDiv.style.width = "99%";
    whiteboardDiv.style.height = "99%";
    whiteboardDiv.style.backgroundColor = "rgba(255, 255, 255, 0.0)";
    whiteboardDiv.style.zIndex = "9999999"; // Higher z-index to ensure it stays on top
    whiteboardDiv.style.border = "1px solid #000";
    whiteboardDiv.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)";
    whiteboardDiv.style.pointerEvents = "auto"; // Ensure the whiteboard is interactive
    whiteboardDiv.style.display = "none"; // Initially hide the whiteboard

    // Create a tab section for buttons
    const tabSection = document.createElement("div");
    tabSection.style.display = "flex";
    tabSection.style.flexDirection = "column"; // Set flex direction to column to stack the buttons
    tabSection.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
    tabSection.style.padding = "10px";
    tabSection.style.borderBottom = "1px solid #000";
    tabSection.style.userSelect = "none";
    tabSection.style.webkitUserSelect = "none";

    // Create the canvas element
    const canvas = document.createElement("canvas");
    canvas.id = "canvas";
    canvas.style.border = "none";
    canvas.style.pointerEvents = "auto"; // Ensure canvas is interactive
    canvas.style.touchAction = "none"; // Prevent touch actions from interfering with drawing
    whiteboardDiv.appendChild(tabSection); // Add the tabSection to the whiteboard
    whiteboardDiv.appendChild(canvas); // Add canvas after the tabSection
    document.body.appendChild(whiteboardDiv);

    const context = canvas.getContext("2d");

    let drawing = false;
    let isStylus = true; // Track if stylus is in use
    let isEraser = false; // Track if eraser is enabled

    // Set canvas dimensions to 98% of the window size
    canvas.width = window.innerWidth * 0.98;
    canvas.height = window.innerHeight * 0.98;

    // Set drawing color and line width
    context.strokeStyle = "#ff0000"; // Default red color
    context.lineWidth = 1; // Set thickness of the line
    context.lineCap = "round"; // Make the drawing lines smooth
    context.lineJoin = "round"; // Make the drawing lines smooth

    // Arrays to store canvas states for undo and redo
    const history = [];
    let historyIndex = -1;

    // Function to get pointer position relative to the canvas
    function getPointerPos(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }
    //When resizing the canvas
    window.onresize = function () {
      canvas.width = window.innerWidth * 0.98;
      canvas.height = window.innerHeight * 0.98;
      if (historyIndex > 0) {
        const lastState = history[historyIndex];
        const img = new Image();
        img.onload = function () {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(img, 0, 0); // Draw the previous canvas state
        };
        img.src = lastState; // Set the image source to the previous canvas state
      }
    };

    // Start drawing (only if it's a stylus) on pointer down
    canvas.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "pen" || isStylus || !isEraser) {
        // Check if it's a stylus (pen) or mouse and not in eraser mode
        drawing = true;
        const pos = getPointerPos(e);
        if (isEraser) {
          context.clearRect(pos.x - 10, pos.y - 10, 20, 20); // Erase content
        } else {
          context.beginPath();
          context.moveTo(pos.x, pos.y);
        }
      }
    });

    // Draw or erase while pointer moves (mouse or stylus)
    document.addEventListener("pointermove", (e) => {
      if (drawing) {
        const pos = getPointerPos(e);
        if (isEraser) {
          context.clearRect(pos.x - 10, pos.y - 10, 20, 20); // Erase content
        } else {
          context.lineTo(pos.x, pos.y);
          context.stroke();
        }
      }
    });

    // Stop drawing or erasing on pointer up
    canvas.addEventListener("pointerup", () => {
      drawing = false;
      //isStylus = false; // Reset the stylus flag
      saveCanvasState(); // Save the current state after every drawing action
    });

    // Stop drawing or erasing if pointer leaves canvas
    canvas.addEventListener("pointerout", () => {
      if (drawing) {
        drawing = false;
      }
    });

    // Function to save the current state of the canvas to the history array
    function saveCanvasState() {
      if (historyIndex < history.length - 1) {
        // Trim redo history if new actions are taken after undo
        history.splice(historyIndex + 1);
      }
      history.push(canvas.toDataURL()); // Save canvas state as a data URL
      historyIndex++; // Update the index
    }

    // Undo Function
    const undoButton = document.createElement("div");
    undoButton.classList.add("gbIcon","gbUndoRedo");
    undoButton.onclick = function () {
      if (historyIndex > 0) {
        historyIndex--; // Move to the previous state in history
        const lastState = history[historyIndex];
        const img = new Image();
        img.onload = function () {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(img, 0, 0); // Draw the previous canvas state
        };
        img.src = lastState; // Set the image source to the previous canvas state
      }
    };
    //undo icon
    const undoIcon=document.createElement("img");
    undoIcon.src=chrome.runtime.getURL("icons/undoButton.svg")
    undoIcon.style.height="2rem";
    undoIcon.style.width="2rem";
    undoButton.appendChild(undoIcon);
    //undo popop
    const undoPopUp=document.createElement("div");
    undoPopUp.innerText="Undo";
    undoPopUp.classList.add("gbPopUp");
    undoButton.appendChild(undoPopUp);

    // Redo Function
    const redoButton = document.createElement("div");
    redoButton.classList.add("gbIcon","gbUndoRedo");
    redoButton.onclick = function () {
      if (historyIndex < history.length - 1) {
        historyIndex++; // Move to the next state in history
        const nextState = history[historyIndex];
        const img = new Image();
        img.onload = function () {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(img, 0, 0); // Draw the next canvas state
        };
        img.src = nextState; // Set the image source to the next canvas state
      }
    };
    //redo icon
    const redoIcon=document.createElement("img");
    redoIcon.src=chrome.runtime.getURL("icons/redoButton.svg")
    redoIcon.style.height="2rem";
    redoIcon.style.width="2rem";
    redoButton.appendChild(redoIcon);

    //redo popop
    const redoPopUp=document.createElement("div");
    redoPopUp.innerText="Redo";
    redoPopUp.classList.add("gbPopUp");
    redoButton.appendChild(redoPopUp);

    // Clear Canvas Function

        //clear icon
    const clearIcon=document.createElement("img");
    clearIcon.src=chrome.runtime.getURL("icons/clearallButton.svg")
    clearIcon.style.height="2rem";
    clearIcon.style.width="2rem";

    const clearButton = document.createElement("div");
    clearButton.classList.add("gbIcon"); 
    clearButton.onclick = function () {
      context.clearRect(0, 0, canvas.width, canvas.height);
      saveCanvasState(); // Save the cleared state
    };
    clearButton.appendChild(clearIcon);
    //clear popup
    const clearPopUp=document.createElement("div");
    clearPopUp.innerText="Clear Canvas";
    clearPopUp.classList.add("gbPopUp");
    clearButton.appendChild(clearPopUp);

    // Create color buttons and store them in the colorButtons array
    const colorButtons = [];
    const colors = ["#ff0000","#000000",  "#00ff00", "#FFA500", "#5DADE2"]; // Red, Black, Green, Orange, Darker Light Blue
    colors.forEach((color) => {
      const colorButton = document.createElement("button");
      //colorButton.innerText = color;
      colorButton.style.marginLeft = "10px";
      colorButton.style.backgroundColor = color;
      colorButton.style.height = "20px";
      colorButton.style.width = "20px";
      colorButton.style.borderRadius = "50%";
      colorButton.style.border = "2px solid transparent"; // Default border style
      colorButton.style.color = color === "#000000" ? "white" : "black"; // Ensure visibility for black button
      colorButton.onclick = function () {
        context.strokeStyle = color; // Change drawing color
        updateColorHighlight(color); // Update color highlight
        colorPicker.value = color;
      };
      colorButtons.push(colorButton); // Store button elements
    });

    // Eraser and Pen buttons
    const eraserButton = document.createElement("div");
    eraserButton.classList.add("gbIcon");
    eraserButton.onclick = function () {
      isEraser = !isEraser; // Toggle between eraser and drawing mode
      eraserButton.style.backgroundColor = isEraser ? "rgb(25,129,240)" : ""; // Change button color based on mode
      penButton.style.backgroundColor = isEraser ? "" : "rgb(25,129,240)";
    };
    //eraser icon
    const eraserIcon=document.createElement("img");
    eraserIcon.src=chrome.runtime.getURL("icons/eraserButton.svg")
    eraserIcon.style.height="2rem";
    eraserIcon.style.width="2rem";
    eraserButton.appendChild(eraserIcon);
    //eraser popop
    const eraserPopUp=document.createElement("div");
    eraserPopUp.innerText="Eraser";
    eraserPopUp.classList.add("gbPopUp");
    eraserButton.appendChild(eraserPopUp);

    const penButton = document.createElement("div");
    penButton.classList.add("gbIcon");
    penButton.style.backgroundColor = "rgb(25,129,240)";
    penButton.onclick = function () {
      isEraser = false; // Disable eraser
      eraserButton.style.backgroundColor = ""; // Reset eraser button color
      penButton.style.backgroundColor = "rgb(25,129,240)";
    };
    //pen icon
    const penIcon=document.createElement("img");
    penIcon.src=chrome.runtime.getURL("icons/penButton.svg")
    penIcon.style.height="2rem";
    penIcon.style.width="2rem";
    penButton.appendChild(penIcon);
    //Pen popup
    const penPopUp=document.createElement("div");
    penPopUp.innerText="Pen";
    penPopUp.classList.add("gbPopUp");
    penButton.appendChild(penPopUp);

    //interact below button
    const interactiveButton = document.createElement("div");
    interactiveButton.classList.add("gbIcon");
    interactiveButton.onclick = function () {
      if (whiteboardDiv.style.pointerEvents === "none") {
        // Re-enable drawing on the whiteboard
        whiteboardDiv.style.pointerEvents = "auto"; // Allow interaction with whiteboard
        canvas.style.pointerEvents = "auto"; // Allow drawing on canvas
        interactivePopUp.innerText="Interact Below";
      } else {
        // Disable interaction with the whiteboard and allow interaction below
        whiteboardDiv.style.pointerEvents = "none"; // Disable interaction with the whiteboard
        canvas.style.pointerEvents = "none"; // Disable drawing on the canvas
        interactiveButton.style.backgroundColor = "red"; // Change button color
        interactivePopUp.innerText="Stop Interacting Below";
      }
      // Ensure the toggle button itself remains clickable
      interactiveButton.style.pointerEvents = "auto";
    };
    //interactBelow icon
    const interactBelowIcon=document.createElement("img");
    interactBelowIcon.src=chrome.runtime.getURL("icons/interactBelowButton.svg")
    interactBelowIcon.style.height="2rem";
    interactBelowIcon.style.width="2rem";
    interactiveButton.appendChild(interactBelowIcon);

    //interactive popup
    const interactivePopUp=document.createElement("div");
    interactivePopUp.innerText="Interact Below";
    interactivePopUp.classList.add("gbPopUp");
    interactiveButton.appendChild(interactivePopUp);


    // Color Picker Button (for choosing a custom color)
    const colorPicker = document.createElement("input");
    colorPicker.type = "color";
    colorPicker.style.marginLeft = "10px";
    colorPicker.value = "#000000";
    colorPicker.innerText = colorPicker.value;
    colorPicker.addEventListener("input", function () {
      colorPicker.innerText = colorPicker.value;
      context.strokeStyle = colorPicker.value; // Set the selected color as the pen color
      updateColorHighlight(colorPicker.value); // Update the color highlight
    });

    //Pen size slider
    const penSliderLabel = document.createElement("label");
    penSliderLabel.innerText = "Pen Size 0.5";
    penSliderLabel.style.marginLeft = "10px";
    penSliderLabel.style.color="black";

    //right side limit
    const penSliderLabel2 = document.createElement("label");
    penSliderLabel2.innerText = "5.5";
    penSliderLabel2.style.marginLeft = "1px";
    penSliderLabel2.style.color="black";


    const penSlider = document.createElement("input");
    penSlider.type = "range";
    penSlider.min = "0.5";
    penSlider.max = "5.5";
    penSlider.value = 1; // Default pen (20%)
    penSlider.style.marginLeft = "5px";
    penSlider.oninput = function () {
      context.lineWidth = parseFloat(penSlider.value); // Adjust background opacity dynamically
    };

    //Button to save the canvas
    const saveButton = document.createElement("div");
    saveButton.classList.add("gbIcon");
    saveButton.onclick = function () {
      saveCanvas();
    };
    //save icon
    const saveIcon=document.createElement("img");
    saveIcon.src=chrome.runtime.getURL("icons/saveButton.svg")
    saveIcon.style.height="2rem";
    saveIcon.style.width="2rem";
    saveButton.appendChild(saveIcon);

    //save popop
    const savePopUp=document.createElement("div");
    savePopUp.innerText="save";
    savePopUp.classList.add("gbPopUp");
    saveButton.appendChild(savePopUp);

    //load a existing canvas image

    const openButton = document.createElement("div");
    openButton.classList.add("gbIcon");

    openButton.onclick = function () {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png";
      input.style.display = "none"; // Optional: Hide the input element

      document.body.appendChild(input); // Append to body or a specific container

      input.onchange = async (event) => {
        const file = event.target.files[0];
        if (file) {
          const canvas = document.querySelector("canvas");
          const context = canvas.getContext("2d");

          const img = new Image();
          img.onload = () => {
            // Clear the canvas before loading the image
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Draw the image onto the canvas
            context.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Remove the input element after the operation
            input.remove();
          };

          // Create a URL for the selected file and load it into the image
          img.src = URL.createObjectURL(file);
        }
      };

      // Trigger the file input click
      input.click();
    };
    //openFile icon
    const openIcon=document.createElement("img");
    openIcon.src=chrome.runtime.getURL("icons/openButton.svg")
    openIcon.style.height="2rem";
    openIcon.style.width="2rem";
    openButton.appendChild(openIcon);

    //open popop
    const openPopUp=document.createElement("div");
    openPopUp.innerText="Open Canvas";
    openPopUp.classList.add("gbPopUp");
    openButton.appendChild(openPopUp);

    //Button to close the whiteboard
    const closeButton = document.createElement("div");
    closeButton.classList.add("gbIcon","gbClose");
    closeButton.style.marginRight = "5px";
    closeButton.onclick = function () {
      toggleButton.style.display = "block";
      whiteboardDiv.style.display = "none";
    };
    //close icon
    const closeIcon=document.createElement("img");
    closeButton.classList.add("gbIcon");
    closeIcon.src=chrome.runtime.getURL("icons/closeButton.svg")
    closeIcon.style.height="2.5rem";
    closeIcon.style.width="2.5rem";
    closeButton.appendChild(closeIcon);
    //close popop
    const closePopUp=document.createElement("div");
    closePopUp.innerText="Close";
    closePopUp.classList.add("gbPopUp");
    closeButton.appendChild(closePopUp);
    

    // Add the Interact below ,Undo, Redo, Clear, Eraser,  Pen, Close buttons to the first row
    const firstRow = document.createElement("div");
    firstRow.style.display = "flex";
    firstRow.id = "gbFirstRow";
    firstRow.style.justifyContent = "flex-end"; // Align buttons to the right
    firstRow.style.marginBottom = "10px"; // Add space between rows
    firstRow.appendChild(interactiveButton);
    firstRow.appendChild(openButton);
    firstRow.appendChild(saveButton);
    firstRow.appendChild(undoButton); // Add undo button
    firstRow.appendChild(redoButton); // Add redo button
    firstRow.appendChild(clearButton);
    firstRow.appendChild(eraserButton);
    firstRow.appendChild(penButton);
    firstRow.appendChild(closeButton);

    // Append first row to the tab section
    tabSection.appendChild(firstRow);

    // Second row for the color buttons , opacity slider and color picker
    const secondRow = document.createElement("div");
    secondRow.style.display = "flex"; // Make sure it's a row now
    secondRow.style.justifyContent = "flex-end"; // Align items to the right
    secondRow.style.marginTop = "10px"; // Add space between rows

    //Add color picker
    secondRow.appendChild(colorPicker);
    // Add color buttons to the second row
    colorButtons.forEach((button) => {
      secondRow.appendChild(button);
    });
    //add Pen size to second row
    secondRow.appendChild(penSliderLabel);
    secondRow.appendChild(penSlider);
    secondRow.appendChild(penSliderLabel2);

    // Opacity slider for the tab section
    const opacitySliderLabel = document.createElement("label");
    opacitySliderLabel.innerText = "Opacity: ";
    opacitySliderLabel.style.marginLeft = "10px";
    opacitySliderLabel.style.color="black";
    secondRow.appendChild(opacitySliderLabel);

    const opacitySlider = document.createElement("input");
    opacitySlider.type = "range";
    opacitySlider.min = "0";
    opacitySlider.max = "100";
    opacitySlider.value = 0; // Default opacity (20%)
    opacitySlider.style.marginLeft = "5px";
    opacitySlider.oninput = function () {
      const opacityValue = opacitySlider.value / 100;
      whiteboardDiv.style.backgroundColor = `rgba(255, 255, 255, ${opacityValue})`; // Adjust background opacity dynamically
    };
    secondRow.appendChild(opacitySlider);

    // Append second row to the tab section
    tabSection.appendChild(secondRow);

    // Bind Undo , Redo and Save actions to keyboard shortcuts (Ctrl + Z for Undo, Ctrl + Y for Redo, Ctrl + S for Save)
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "z") {
        undoButton.click(); // Trigger Undo
      }
      if (e.ctrlKey && e.key === "y") {
        redoButton.click(); // Trigger Redo
      }
      if (e.ctrlKey && e.key === "s") {
        saveButton.click(); //Trigger Save
        e.preventDefault();
      }
    });

    // Function to update color highlight
    function updateColorHighlight(selectedColor) {
      colorButtons.forEach((button) => {
        const buttonColor = rgbToHex(button.style.backgroundColor);
        button.style.border = compareColors(buttonColor, selectedColor)
          ? "3px solid yellow"
          : "2px solid transparent";
      });
    }

    // Function to compare colors in both hex and rgb formats
    function compareColors(color1, color2) {
      return rgbToHex(color1).toLowerCase() === rgbToHex(color2).toLowerCase();
    }

    // Convert rgb color to hex
    function rgbToHex(rgb) {
      const result =
        /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d*\.?\d+))?\)$/.exec(rgb);
      return result
        ? "#" +
            ((1 << 24) | (+result[1] << 16) | (+result[2] << 8) | +result[3])
              .toString(16)
              .slice(1)
              .toUpperCase()
        : rgb; // Return the color as-is if it's already in hex
    }

    // Open/Close whiteboard button (toggle functionality)
    const toggleButton = document.createElement("button");
    toggleButton.id = "whiteBoardToggleButton";
    toggleButton.innerText = "Open Glassboard";
    toggleButton.style.position = "fixed";
    toggleButton.style.top = "10px";
    toggleButton.style.right = "10px";
    toggleButton.style.zIndex = "999999999";
    toggleButton.style.backgroundColor = "green"; // Green for open
    toggleButton.style.color = "white";
    toggleButton.style.border = "none";
    toggleButton.style.padding = "10px";
    toggleButton.style.fontSize = "16px";
    toggleButton.style.borderRadius = "5px";
    toggleButton.style.userSelect = "none";
    toggleButton.onclick = function () {
      if (whiteboardDiv.style.display === "none") {
        whiteboardDiv.style.display = "block";
        toggleButton.style.display = "none";
      }
    };
    document.body.appendChild(toggleButton);

    // Initial highlight on selected color
    updateColorHighlight(context.strokeStyle);
  }

  // Create the whiteboard immediately
  createWhiteboard();
};
