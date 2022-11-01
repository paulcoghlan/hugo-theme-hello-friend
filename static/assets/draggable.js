// TODO: move into a js class
let draggables = document.querySelectorAll('.photo-container > .photo-item')
draggables.forEach(item => {
  $(item).prop('draggable', true)
  item.addEventListener('dragstart', dragStart)
  item.addEventListener('drop', dropped)
  item.addEventListener('dragenter', cancelDefault)
  item.addEventListener('dragover', cancelDefault)
})

let nondraggables = document.querySelectorAll('.photo-container > .photo-item > img')
nondraggables.forEach(item => {
  item.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
})

function dragStart (e) {
  var index = $(e.target).index()
  console.log("dragStart: index: " + index);
  e.dataTransfer.setData('text/plain', index)
}

function dropped (e) {
  cancelDefault(e)
  
  // get new and old index
  let oldIndex = e.dataTransfer.getData('text/plain')
  console.log("dragEnd: oldIndex: " + oldIndex);

  // $(this) != $(e.target) - WHY?
  let target = $(this)
  let newIndex = $(this).index()
  console.log("dragEnd: newIndex: " + newIndex);
  // remove dropped items at old place
  let dropped = $(this).parent().children().eq(oldIndex).remove()

  // insert the dropped items at new place
  if (newIndex < oldIndex) {
    target.before(dropped)
  } else {
    target.after(dropped)
  }
  
  galleryProps.captions = false;
  $('#lightgallery').justifiedGallery(
    galleryProps
  );
}

function cancelDefault (e) {
  e.preventDefault()
  e.stopPropagation()
  return false
}
