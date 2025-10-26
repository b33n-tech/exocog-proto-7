// ----------------------
// STACK 1 : Gestion tâches
// ----------------------
const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const tasksContainer = document.getElementById("tasksContainer");
const buttonsRow = document.querySelector(".buttons-row");
const promptsContainer = document.getElementById("promptsContainer");
const copiedMsg = document.getElementById("copiedMsg");
const uploadJson = document.getElementById("uploadJson");
const llmSelect = document.getElementById("llmSelect");
const pasteDownloadBtn = document.getElementById("pasteDownloadBtn");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

// Format date
function formatDate(iso){
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2,'0');
  const month = String(d.getMonth()+1).padStart(2,'0');
  const hours = String(d.getHours()).padStart(2,'0');
  const minutes = String(d.getMinutes()).padStart(2,'0');
  return `${day}/${month} ${hours}:${minutes}`;
}

// Render tasks
function renderTasks(){
  tasksContainer.innerHTML = "";
  tasks.forEach((task,index)=>{
    const li = document.createElement("li");
    li.className = "task-item";

    const taskText = document.createElement("div");
    taskText.className = "task-text";
    taskText.textContent = task.text + " ("+task.date.split("T")[0]+")";

    if(task.comments?.length){
      taskText.title = task.comments.map(c=>`• ${c.text} (${formatDate(c.date)})`).join("\n");
    }

    const commentBlock = document.createElement("div");
    commentBlock.className = "comment-section";

    const commentList = document.createElement("ul");
    commentList.className = "comment-list";
    if(task.comments?.length){
      task.comments.forEach(c=>{
        const cLi = document.createElement("li");
        cLi.textContent = `[${formatDate(c.date)}] ${c.text}`;
        commentList.appendChild(cLi);
      });
    }
    commentBlock.appendChild(commentList);

    const commentInputDiv = document.createElement("div");
    commentInputDiv.className = "comment-input";
    const commentInput = document.createElement("input");
    commentInput.placeholder = "Ajouter un commentaire…";
    const commentBtn = document.createElement("button");
    commentBtn.textContent = "+";
    commentBtn.addEventListener("click", ()=>{
      const val = commentInput.value.trim();
      if(val!==""){
        if(!task.comments) task.comments=[];
        task.comments.push({text:val,date:new Date().toISOString()});
        localStorage.setItem("tasks", JSON.stringify(tasks));
        commentInput.value="";
        renderTasks();
        renderStack2();
      }
    });
    commentInputDiv.appendChild(commentInput);
    commentInputDiv.appendChild(commentBtn);
    commentBlock.appendChild(commentInputDiv);

    li.appendChild(taskText);
    li.appendChild(commentBlock);

    taskText.addEventListener("click", ()=>{
      commentBlock.style.display = commentBlock.style.display==="none"?"flex":"none";
    });

    tasksContainer.appendChild(li);
  });
}

// Ajouter tâche
addBtn.addEventListener("click", ()=>{
  const text = taskInput.value.trim();
  if(text!==""){
    tasks.push({text,date:new Date().toISOString(),comments:[]});
    localStorage.setItem("tasks", JSON.stringify(tasks));
    taskInput.value="";
    renderTasks();
    renderStack2();
  }
});

// Boutons nettoyages / archive
const clearBtn = document.createElement("button");
clearBtn.textContent = "🧹 Tout nettoyer";
clearBtn.addEventListener("click", ()=>{
  if(confirm("Es-tu sûr ?")){
    tasks=[]; localStorage.removeItem("tasks");
    renderTasks();
    renderStack2();
  }
});
buttonsRow.appendChild(clearBtn);

const archiveBtn = document.createElement("button");
archiveBtn.textContent = "📂 Archiver JSON";
archiveBtn.addEventListener("click", ()=>{
  if(tasks.length===0){ alert("Aucune tâche !"); return; }
  const blob = new Blob([JSON.stringify(tasks,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url;
  a.download = `taches_${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
buttonsRow.appendChild(archiveBtn);

// Prompts LLM
const prompts = [
  {id:"plan",label:"Plan",text:"Transforme ces tâches en plan structuré étape par étape :"},
  {id:"priorite",label:"Priorité",text:"Classe ces tâches par ordre de priorité et urgence :"},
  {id:"categorie",label:"Catégorie",text:"Range ces tâches dans des catégories logiques :"}
];
prompts.forEach(p=>{
  const btn = document.createElement("button");
  btn.textContent = p.label;
  btn.addEventListener("click", ()=>{
    const combined = p.text+"\n\n"+tasks.map(t=>{
      let str = "- "+t.text;
      if(t.comments?.length){
        str+="\n  Commentaires :\n"+t.comments.map(c=>`    - [${formatDate(c.date)}] ${c.text}`).join("\n");
      }
      return str;
    }).join("\n");
    navigator.clipboard.writeText(combined).then(()=>{
      copiedMsg.style.display="block";
      setTimeout(()=>copiedMsg.style.display="none",2000);
      window.open(llmSelect.value,"_blank");
    });
  });
  promptsContainer.appendChild(btn);
});

// Upload JSON
uploadJson.addEventListener("change", event=>{
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    try{
      const data = JSON.parse(e.target.result);
      if(Array.isArray(data)) tasks.push(...data);
      localStorage.setItem("tasks",JSON.stringify(tasks));
      renderTasks();
      renderStack2();
    }catch(err){console.error(err);}
  };
  reader.readAsText(file);
});

// Paste + download
pasteDownloadBtn.addEventListener("click", async ()=>{
  try{
    let raw = await navigator.clipboard.readText();
    raw = raw.trim().replace(/^```[\w]*|```$/g,"").trim();
    const data = JSON.parse(raw);
    if(Array.isArray(data)) tasks.push(...data);
    localStorage.setItem("tasks",JSON.stringify(tasks));
    renderTasks();
    renderStack2();

    // téléchargement
    const blob = new Blob([JSON.stringify(tasks,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url;
    a.download = `taches_${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }catch(err){ alert("JSON invalide ou presse-papier vide !"); }
});

// ----------------------
// STACK 2 : Modules / Traitement
// ----------------------
const jalonsList = document.getElementById("jalonsList");
const messagesList = document.getElementById("messagesList");
const rdvList = document.getElementById("rdvList");
const livrablesList = document.getElementById("livrablesList");

function renderStack2(){
  // réinitialisation
  jalonsList.innerHTML="";
  messagesList.innerHTML="";
  rdvList.innerHTML="";
  livrablesList.innerHTML="";

  tasks.forEach(t=>{
    // Simule modules selon texte
    if(t.text.toLowerCase().includes("jalon")){
      const li = document.createElement("li");
      li.textContent = t.text;
      jalonsList.appendChild(li);
    }else if(t.text.toLowerCase().includes("message")){
      const tr = document.createElement("tr");
      const tdCheck = document.createElement("td");
      const cb = document.createElement("input");
      cb.type="checkbox";
      tdCheck.appendChild(cb);
      tr.appendChild(tdCheck);

      const rest = t.text.replace(/\[Message\]/i,"").split("→");
      tr.appendChild(document.createElement("td")).textContent = rest[1]?.trim()||"";
      tr.appendChild(document.createElement("td")).textContent = rest[0]?.trim()||"";
      tr.appendChild(document.createElement("td")).textContent = "";
      messagesList.appendChild(tr);
    }else if(t.text.toLowerCase().includes("rdv")){
      const li = document.createElement("li");
      li.textContent = t.text;
      rdvList.appendChild(li);
    }else if(t.text.toLowerCase().includes("livrable")){
      const li = document.createElement("li");
      li.textContent = t.text;
      livrablesList.appendChild(li);
    }
  });
}

// Initial render
renderTasks();
renderStack2();
