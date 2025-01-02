

/*
const tankHeight = ?;
const tankDiameter = ?;
const sensorHeight = ?;
let dangerTopLevel = 95; // %
let dangerBottomLevel = 5; // %
let warningTopLevel = 90; // %
let warningBottomLevel = 10; // %
let nextCssTopLevel = 50; // %
// Css top values
const maxLevel = 15;
const minLevel = 360;
*/

// Valores principales
let currSensorVal = 500; // valor del sensor en mm (min 200- max 3250)
let levelHeight = ""; // altura del nivel en mm
let serverResp = ""; // datos devueltos del servidor (fecha, nivel)

// Porcentajes
let nextLevelPercent = 50; // %
let currLevelPercent = 5; // %

// Valores Top CSS elemento "liquid"
let nextCssTopLevel = 195; // CSS min: 375 - max: 15
let currCssTopLevel = 360; // CSS min: 375 - max: 15

// Formulario
let tankHeight = document.getElementById("tankHeight").value; // 305 cm
let tankDiameter = document.getElementById("tankDiameter").value; // 210 cm
let sensorHeight = document.getElementById("sensorHeight").value; // 20 cm
let dangerTopLevel = document.getElementById("dangerTopLevel").value; //95%
let dangerBottomLevel = document.getElementById("dangerBottomLevel").value; //5%
let warningTopLevel = document.getElementById("warningTopLevel").value; //10%
let warningBottomLevel = document.getElementById("warningBottomLevel").value; //90%

// estado de las alertas
let warningStatusInProgress = false;
let dangerStatusInProgress = false;

// Elemento liquido en tanque
const element = document.getElementById('liquid');

// Progress Bar
const txtProgressBar = document.getElementById("progress-bar-text");
const progressBar = document.getElementById("progressbar");

// Tabla de datos
const tdHeightLiquid = document.getElementById("heightLiquid");
const tdContentLiters = document.getElementById("contentLiters");
const tdContentM3 = document.getElementById("contentM3");
const tdExchangeRate = document.getElementById("exchangeRate");
const tdLastUpdate = document.getElementById("lastUpdate");

// Ventana modal
let modal = new bootstrap.Modal(document.getElementById('staticBackdrop'));

/**********************************************************************************************************/
  /****************************************************************************************
   * funcion general para la solicitud de datos al servidor
   * request: Objet JS: contiene datos usados por el servidor para devolver una respuesta.
   *                    contendrá al menos "action" con la accion a realizar
   *                    y "accessKey" con las credenciales de acceso.
   *                    Tambien pueden ser enviados datos adicionales.
   ****************************************************************************************/
  function getRequest( ){

    google.script.run
    .withSuccessHandler( function( response ){
			serverResp = response;
			updateAppLevelTank();
    })
    //.withFailureHandler(errorHandler)
    .getSensorVal();
  }

/**********************************************************************************************************/

/**********************************************************************************************
 * Funcion principal que maneja la aplicacion que requiere de la previa actualizacion de
 * "currSensorVal" para ejecutarse correctamente.
 **********************************************************************************************/
function updateAppLevelTank(){

	currSensorVal = serverResp.level;

	calcNextLevelPercent();
	updateLiquidLevelAnimation();
	updateTableData();
}

/*********************************************************************************************
 * Actualiza la tabla de datos del medidor de nivel
 *********************************************************************************************/
function updateTableData(){

	let contentCm3 = calcVolumeCylinder( (levelHeight / 10), (tankDiameter / 2) );

	tdHeightLiquid.innerHTML = getClrNumber( levelHeight / 10 )+" cm";
	tdContentLiters.innerHTML = getClrNumber( contentCm3 / 1000 )+" Litros";
	tdContentM3.innerHTML = getClrNumber( contentCm3/ 1000000 )+" m<sup>3</sup>";
	tdExchangeRate.innerHTML = "en proceso";
	tdLastUpdate.innerHTML = serverResp.date;
}

/*********************************************************************************************************
 * Formatea el numero pasado como parametro con parte entera en negrita
 * y dos decimales en la parte final (con el proposito que sea mas legible)
 * @param {number} number numero a formatear
 * @returns String HTML
 *********************************************************************************************************/
function getClrNumber( number ){
	return "<strong>"+Math.floor(number)+"</strong>,"+number.toFixed(2).split('.')[1];
}

/*********************************************************************************************
 * Calcula el porcentaje del nivel del tanque con base en el valor currSensorVal
 *********************************************************************************************/
function calcNextLevelPercent(){
	// altura_nivel_a_boca_tk = altura_mm_nivel - ((altura_total_Tk - altura_total_sensor) se pasa de cm a mm)
	let tkTopHeight = currSensorVal - (sensorHeight * 10 );
	levelHeight = (tankHeight * 10) - tkTopHeight; // mm
	// calcular
	nextLevelPercent = (levelHeight / (tankHeight * 10)) * 100;
}

/*****************************************************************************************************
 * Funcion para cambiar el color del liquido segun la altura
 *****************************************************************************************************/
function updateLiquidLevelAnimation() {

  // falta barra de progreso
	//nextLevelPercent = document.getElementById("inputUpdateLiquid").value;
	nextCssTopLevel = percenToCssTop(nextLevelPercent);
	document.documentElement.style.setProperty('--tk1OldTop', currCssTopLevel+'px');
	document.documentElement.style.setProperty('--tk1NewTop', nextCssTopLevel+'px');
	element.style.top = nextCssTopLevel+"px";
	element.classList.add("levelAnimation");
	// Iniciar la función de seguimiento cuando comience la animación
	requestAnimationFrame(checkLevelPosition);
	currLevelPercent = nextLevelPercent;
	currCssTopLevel = nextCssTopLevel;
}

/*************************************************************************************************************
 * Recibe el valor en porcentaje (0% a 100%) y devuelve el valor correspondiente en pixeles para
 * el atributo top del CSS para el elemento liquido, este valor será usado para establecer el
 * nivel del tanque en la animación.
 * Logica de la ecuación: rango para valor Top: 375px = 0% y 15px = 100%
 * porcentaje => 0.algo
 * 0.algo * 360
 * @param {int} percent porcentaje a convertir en valor Top CSS
 * @returns 
 *************************************************************************************************************/
function percenToCssTop( percent ) {

  // Calcular el valor correspondiente al porcentaje
	let valTop = 375 - (percent / 100) * (375 - 15);
  
  return Math.trunc(valTop); // devuelve parte entera
}

/*************************************************************************************************************
 * Recibe el valor en pixeles corespondientes al valor de la propiedad CSS Top del elemento "liquid" y
 * devuelve el valor corespondiente al porcentaje de llenado del tanque, este valor será usado para
 * mostrar el nivel del tanque en porcentaje.
 * @param {int} cssTop valor en pixeles del elemento l
 * @returns 
 *************************************************************************************************************/
function cssTopToPercen( cssTop ) {

  // Calcular el valor en pixeles correspondiente al porcentaje
	let percent = ((375 - cssTop) / (375 - 15)) * 100;
  
	return Math.trunc(percent);// devuelve parte entera
}

/*******************************************************************************************
 * Funcion para calcular el volumen de un cilindro en centimetros cubicos cm^3
 * @param {int} cylinderH altura del cilindro en cm
 * @param {int} cylinderR radio del cilindro en cm
 * @returns Volumen del cilindro en cm^3 (solo devuelve dos decimales)
 *******************************************************************************************/
function calcVolumeCylinder( cylinderH, cylinderR ){

	let volume = Math.PI * ( cylinderR ** 2 ) * cylinderH;

	return volume.toFixed(2);
}

/**************************************************************************************
 * Funcion que actualiza los elementos y valores relacionados con la progressbar
 * @param {int} percent procentaje de progreso
 **************************************************************************************/
function updateProgressbar( percent ){

	txtProgressBar.innerHTML = percent+"%";
	progressBar.setAttribute("aria-valuenow", percent);
	progressBar.setAttribute("style", "width: "+percent+"%;");

	// Verificar si el porcentaje esta en ciertos puntos clave
	if ( percent >= dangerTopLevel || percent <= dangerBottomLevel) { // add Danger class
		if( !progressBar.classList.contains("bg-danger") ){
			progressBar.classList.remove("bg-info", "bg-warning");
			progressBar.classList.add("bg-danger");
		}
		
	} else if (percent >= warningTopLevel || percent <= warningBottomLevel ) { // add warning class
		if( !progressBar.classList.contains("bg-warning") ){
			progressBar.classList.remove("bg-info", "bg-danger");
			progressBar.classList.add("bg-warning");
		}
		
	} else {
		if( !progressBar.classList.contains("bg-info") ){
			progressBar.classList.remove("bg-warning", "bg-danger");
			progressBar.classList.add("bg-info");
		}
	}
}

/**************************************************************************************************************************
	* Verifica duarante cada frame de la animacion el valor de top del elemento liquido para cambiar el color del liquido
	* con base en los niveles de advertencia (amarillo) y peligro (rojo), se usan clases en el HTML junto con la propiedad
	* transition del CSS para el cambio de color
  **************************************************************************************************************************/
function checkLevelPosition() {
	// Obtener el valor actual de 'top'
	const topValue = parseInt(window.getComputedStyle(element).top, 10);

  console.log("executing verification...");

	// Verificar si 'top' esta en ciertos puntos clave
	if (topValue >= percenToCssTop( dangerBottomLevel ) || topValue <= percenToCssTop( dangerTopLevel )) { // add Danger class
		if( !element.classList.contains("red") ){
			element.classList.remove("blue", "yellow");
			element.classList.add("red");
			launchAlert("danger");
		}
		
	} else if (topValue >= percenToCssTop( warningBottomLevel ) || topValue <= percenToCssTop( warningTopLevel )) { // add warning class
		if( !element.classList.contains("yellow") ){
			element.classList.remove("blue", "red");
			element.classList.add("yellow");
			//launchAlert("warning");
		}
		
	} else {
		if( !element.classList.contains("blue") ){
			element.classList.remove("yellow", "red");
			element.classList.add("blue");
			warningStatusInProgress = false;
			dangerStatusInProgress = false;
		}
	}

	updateProgressbar( cssTopToPercen(topValue) );

	// Continuar la animación mientras 'top' diferente al siguiente top
	if (topValue != nextCssTopLevel) {
		requestAnimationFrame(checkLevelPosition);
		//txtHeightLiquid.innerHTML = tankHeight;
		
		//console.log(currLevelPercent);
	}else{
		element.classList.remove("levelAnimation");
		console.log("Verification completed");
	}
}

/*****************************************************************************
 * funcion para lanzar la ventana modal de alerta
 * @param {String} alertType warning/danger
 *****************************************************************************/
function launchAlert( alertType ){

	const modalTitle = document.getElementById("staticBackdropLabel");
	const modalBody = document.getElementById("modal-body");

	modalTitle.innerHTML = "";
	modalBody.innerHTML = "";

	switch (alertType) {

		case "warning":
			modalTitle.innerHTML = "¡Advertencia!";
			modalBody.innerHTML = "<div class='alert alert-warning' role='alert'>El nivel del tanque ha alcanzado un nivel alto</div>";
			warningStatusInProgress = true;
			break;

		case "danger":
			modalTitle.innerHTML = "¡Peligro!";
			modalBody.innerHTML = "<div class='alert alert-danger' role='alert'>El nivel del tanque se encuentra en nivel crítico</div>";
			dangerStatusInProgress = true;
			break;

		default:
			break;
	}
	// modificar datos de modal
	modal.show();
	//modal.hide();
	playAudio(alertType);
}

/**********************************************************************************
 * Reproduce el audio de la alerta segun el parametro pasado
 * @param {String} audioType warning/danger
 **********************************************************************************/
function playAudio( audioType ) {

	let audioElement = "";

	switch (audioType) {
		case "warning":
			audioElement = "modalAudioWarning";
			break;
		case "danger":
			audioElement = "modalAudioDanger";
			break;
		default:
			break;
	}

	const audio = document.getElementById( audioElement );

	audio.play();
}

/***********************************************************************************************
 * Consulta el nivel en el servidor inmediatamente al cargar y actualiza la aplicación
 ***********************************************************************************************/
window.onload = function() {
	getRequest(); // Llamar inmediatamente al cargar
	setInterval(getRequest, 30000); // Llamar cada 30 segundos
};