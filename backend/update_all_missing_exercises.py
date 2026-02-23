import sqlite3

def get_exercise_data():
    return {
        "curl_biceps_barra": {
            "description": "Ejecución:\n1. De pie, sujeta la barra con agarre supino (palmas hacia arriba) al ancho de los hombros.\n2. Mantén la espalda recta y el abdomen contraído.\n3. Flexiona los codos para subir la barra hacia el pecho, manteniendo los codos fijos a los lados del torso.\n4. Baja la barra lenta y controladamente hasta extender casi por completo los brazos.",
            "safety_notes": "No balances el cuerpo hacia atrás para subir el peso. Si necesitas balancearte, el peso es excesivo. Mantén las muñecas neutras para evitar tendinitis.",
            "muscles": "Bíceps, Braquial, Antebrazos"
        },
        "curl_biceps_mancuernas": {
            "description": "Ejecución:\n1. De pie o sentado, sujeta una mancuerna en cada mano con agarre supino.\n2. Inicia el movimiento elevando las mancuernas flexionando los codos.\n3. Aprieta el bíceps en la parte superior del movimiento.\n4. Desciende controlando la fase excéntrica (bajada) para maximizar la hipertrofia.",
            "safety_notes": "Mantén los codos anclados a los costados del cuerpo. Evita encoger los hombros. Controla la bajada en todo momento.",
            "muscles": "Bíceps, Braquial"
        },
        "sentadilla_espanola": {
            "description": "Ejecución:\n1. Fija una banda de resistencia gruesa a un poste y colócala detrás de tus rodillas (zona poplítea).\n2. Da un paso atrás hasta que la banda esté tensa.\n3. Desciende en sentadilla manteniendo el torso erguido. La banda jalará tus rodillas hacia adelante, obligando a los cuádriceps a trabajar fuertemente.\n4. Sube empujando desde los talones.",
            "safety_notes": "Asegúrate de que la banda esté firmemente sujeta al poste. Mantén la presión hacia atrás contra la banda durante todo el movimiento. Ideal para tendinopatía rotuliana.",
            "muscles": "Cuádriceps, Glúteos"
        },
        "isometria_pared": {
            "description": "Ejecución:\n1. Apoya tu espalda contra una pared.\n2. Deslízate hacia abajo hasta que tus rodillas estén a 90 grados, como si estuvieras sentado en una silla invisible.\n3. Mantén la postura estática el tiempo indicado.",
            "safety_notes": "No dejes que las rodillas colapsen hacia dentro. Mantén el peso distribuido en todo el pie, con énfasis en el talón. Si hay dolor punzante, sube un poco la cadera.",
            "muscles": "Cuádriceps, Isquiotibiales, Glúteos"
        },
        "puente_gluteo": {
            "description": "Ejecución:\n1. Acuéstate boca arriba con rodillas flexionadas y pies planos en el suelo cerca de los glúteos.\n2. Empuja con los talones y eleva la cadera hasta que tu cuerpo forme una línea recta desde las rodillas hasta los hombros.\n3. Contrae fuertemente los glúteos en la posición máxima.\n4. Desciende lentamente.",
            "safety_notes": "No arquees la zona lumbar (espalda baja) de forma exagerada en la parte superior. El movimiento debe provenir de los glúteos, no de hiperextender la espalda.",
            "muscles": "Glúteos, Isquiotibiales, Core"
        },
        "face_pull": {
            "description": "Ejecución:\n1. Coloca una polea o banda elástica a la altura de la cara o ligeramente superior.\n2. Agarra los extremos con ambas manos y jala hacia tu cara, separando las manos a medida que se acercan a ti.\n3. Aprieta las escápulas (omóplatos) juntas en la posición final. Los codos deben apuntar hacia atrás y hacia afuera.\n4. Vuelve a la posición inicial controlando el peso.",
            "safety_notes": "No uses un peso excesivo que te obligue a usar el impulso lumbar. Mantén el core firme para evitar arquear la espalda.",
            "muscles": "Hombros (Deltoides posterior), Trapecio, Romboides"
        },
        "psoas_stretch": {
            "description": "Ejecución:\n1. Adopta una posición de zancada (Lunge) con la rodilla trasera apoyada en un cojín o colchoneta (Posición del caballero).\n2. Contrae el glúteo de la pierna trasera e inclina *ligeramente* la pelvis hacia atrás (retroversión pélvica).\n3. Desplaza suavemente el peso hacia adelante sin perder la retroversión de la pelvis hasta sentir el estiramiento en la parte frontal de la cadera.",
            "safety_notes": "Si sientes el estiramiento en la zona lumbar (baja la espalda) en lugar de la parte frontal de la cadera, corrige la rotación de tu pelvis. No te excedas en el rango, busca una tensión suave a moderada.",
            "muscles": "Cadera (Psoas ilíaco), Cuádriceps (Recto femoral)"
        },
        "plancha_copenhague": {
            "description": "Ejecución:\n1. Colócate en posición de plancha lateral.\n2. Apoya la pierna superior sobre un banco o silla.\n3. Eleva la cadera y junta la pierna inferior hacia la base del banco.\n4. Mantén la posición isométrica asegurando que tu cuerpo sea una línea recta.",
            "safety_notes": "Ejercicio avanzado para aductores. Si molesta la rodilla, apoya el peso sobre el muslo o rodilla en el banco en lugar del pie. Mantén fuerte el core.",
            "muscles": "Aductores (Entrepierna), Core (Oblicuos)"
        },
        "gemelos_excentricos": {
            "description": "Ejecución:\n1. Párate en el borde de un escalón apoyando solo la punta de los pies (metatarsos).\n2. Sube rápidamente usando ambas piernas.\n3. Quita una pierna (déjala en el aire) y baja lentamente (3-4 segundos) usando solo una pierna hasta que el talón caiga por debajo del escalón.\n4. Repite el proceso.",
            "safety_notes": "Crucial para tendinopatía aquílea. Sentirás estiramiento profundo, esto es normal. Controla la bajada obligatoriamente, no te dejes caer de golpe.",
            "muscles": "Pantorrillas (Gastronemio, Sóleo)"
        },
        "sentadilla_bulgara": {
            "description": "Ejecución:\n1. Colócate de espaldas a un banco y apoya el empeine de un pie sobre él.\n2. El pie delantero debe estar suficientemente adelantado.\n3. Desciende flexionando la rodilla delantera hasta que el muslo esté paralelo al suelo. El torso puede inclinarse ligeramente hacia adelante si buscas más énfasis en glúteo.\n4. Sube empujando fuerte con el pie delantero.",
            "safety_notes": "La rodilla delantera debe apuntar en la dirección del pie, evita que colapse hacia dentro (valgo). Mantén el equilibrio fijando la mirada en un punto.",
            "muscles": "Cuádriceps, Glúteos, Isquiotibiales"
        },
        "rotacion_externa_hombro": {
            "description": "Ejecución:\n1. Ajusta una polea a la altura del codo o usa una banda elástica.\n2. Con el codo pegado al costado del cuerpo y flexionado a 90 grados, sujeta el agarre con la mano contraria a la polea.\n3. Rota externamente el brazo alejando la mano del cuerpo, sin despegar el codo de la costilla.\n4. Regresa lentamente.",
            "safety_notes": "Usa cargas muy ligeras. Este es un ejercicio preventivo para el manguito rotador, no un ejercicio de fuerza bruta. Colocar una toalla enrollada entre el codo y el torso mejora la mecánica.",
            "muscles": "Hombros (Manguito rotador, Infraespinoso)"
        },
        "movilidad_toracica": {
            "description": "Ejecución:\n1. Acuéstate de lado con las rodillas flexionadas a 90 grados apoyadas en el suelo.\n2. Extiende los brazos frente a ti, palmas juntas.\n3. Como si abrieras un libro, lleva el brazo superior hacia el techo y luego hacia el suelo o lado opuesto, rotando el torso (caja torácica) e intentando tocar el hombro opuesto al suelo.\n4. La mirada debe seguir a la mano que se mueve. Regresa.",
            "safety_notes": "Asegúrate de que las rodillas no se levanten del suelo al girar el tronco superior. El movimiento debe ocurrir en la columna media/alta, no en la baja.",
            "muscles": "Espalda (Columna Torácica), Pecho (Pectoral Mayor)"
        },
        "hip_thrust_barra": {
            "description": "Ejecución:\n1. Apoya la espalda alta (parte inferior de las escápulas) en un banco.\n2. Sitúa la barra cargada (con almohadilla preferentemente) sobre tu cadera/cresta ilíaca.\n3. Con los pies planos en el suelo al ancho de hombros, empuja la cadera hacia el techo hasta lograr extensión completa.\n4. Las rodillas deben estar a 90 grados en la posición superior. Contrae glúteos.",
            "safety_notes": "Mantén la mirada al frente (mentón metido) para bloquear la hiperextensión lumbar. No uses las lumbares para elevar el peso, la fuerza sale de glúteos e isquios.",
            "muscles": "Glúteos, Isquiotibiales, Core"
        },
        "press_hombros_mancuernas": {
            "description": "Ejecución:\n1. Sentado en un banco con respaldo a 90-75 grados, eleva las mancuernas a la altura de los hombros (palmas apuntando hacia delante o en ligero agarre neutro).\n2. Empuja las mancuernas hacia arriba por encima de la cabeza hasta que los brazos estén estirados pero no bloqueados rígidamente.\n3. Baja controladamente hasta la posición inicial.",
            "safety_notes": "Controla que los codos no caigan demasiado por debajo de la línea paralela al hombro si no tienes buena movilidad. No arquees excesivamente la espalda baja.",
            "muscles": "Hombros (Deltoides anterior/medio), Tríceps"
        },
        "elevacion_lateral_mancuernas": {
            "description": "Ejecución:\n1. De pie, con una mancuerna en cada mano a los costados del cuerpo. Pecho arriba.\n2. Eleva los brazos lateralmente con una ligerísima flexión de codos, hasta quedar paralelos al suelo (formando una T o Y).\n3. Imagina que vacías una jarra de agua en la parte superior del movimiento. Baja lentamente.",
            "safety_notes": "No uses el cuerpo para tomar impulso. Mantén un control estricto de los hombros, sin subirlos hacia las orejas. Las manos no deben superar la altura de los hombros.",
            "muscles": "Hombros (Deltoides medio)"
        },
        "elevacion_frontal_mancuernas": {
            "description": "Ejecución:\n1. De pie o sentado, sostén las mancuernas apoyadas en la parte frontal de los muslos (agarre prono).\n2. Eleva los brazos estirados hacia el frente (ligerísima flexión del codo) hasta llegar a la altura de la vista (paralelos al piso).\n3. Desciende con control pausado.",
            "safety_notes": "No te eches hacia atrás (hiperextensión lumbar) para lograr subir el peso. Realiza el ejercicio aislado para evitar lesiones en el manguito rotador.",
            "muscles": "Hombros (Deltoides anterior)"
        },
        "extension_triceps_mancuerna": {
            "description": "Ejecución:\n1. Sentado o de pie, agarra una mancuerna (o dos pequeñas) por encima de la cabeza con brazos extendidos.\n2. Desciende el peso lentamente por detrás de la cabeza flexionando exclusivamente los codos.\n3. Sube a la posición inicial sintiendo el estiramiento del tríceps.",
            "safety_notes": "Usa una carga que domines por completo. Mantén los codos quietos apuntando hacia el techo tanto como puedas; que no se abran de par en par.",
            "muscles": "Tríceps (Cabeza Larga), Hombros"
        },
        "fondo_banco": {
            "description": "Ejecución:\n1. Coloca las manos en el borde de un banco o silla, con los dedos apuntando al cuerpo.\n2. Distancia los pies hacia delante (piernas estiradas es más difícil, semiflexionadas más fácil).\n3. Baja el cuerpo bajando los glúteos hacia el suelo mediante la flexión de los codos hasta unos 90 grados.\n4. Empuja el banco para volver a subir.",
            "safety_notes": "Mantén los glúteos rozando el borde del banco. Bajar demasiado vertical o alejar la cadera del banco pone en riesgo extremo a los hombros mediante fricción acromial.",
            "muscles": "Tríceps, Pecho (Inferior), Hombros (Deltoides anterior)"
        },
        "sentadilla_remo_polea": {
            "description": "Ejecución:\n1. Agarra un manillar acoplado a una polea baja o banda elástica nivelada a la altura de tu esternón.\n2. Realiza una sentadilla profunda descendiendo controladamente al tiempo que tus brazos se estiran, sintiendo el jalón que asiste tu equilibrio.\n3. Al subir, tracciona simultáneamente los brazos hacia el abdomen ejecutando un remo estrecho.",
            "safety_notes": "Sincronizar el descenso con estirar los brazos y el subir con la tracción. Mantener zona central activa y usar fluidamente para desestresar rodillas.",
            "muscles": "Cuádriceps, Espalda (Dorsal/Romboides), Bíceps"
        },
        "foam_roller_cuadriceps": {
            "description": "Ejecución:\n1. Ubícate boca abajo (plancha) teniendo un rolo o tubo de espuma bajo ambos cuádriceps.\n2. Incorpórate moviéndote desde las caderas hacia las rodillas despacio buscando puntos duros, dolorosos o contraídos.\n3. Cuando consigas un punto clave, frena en él, y exhala soltando la dureza del músculo (liberación miofascial).",
            "safety_notes": "El dolor no debe ser agudo de grado lesión, solo presión soportable estilo masaje intenso. No masajear las articulaciones ni huesos en sí.",
            "muscles": "Cuádriceps, Tracto Iliotibial (TFL)"
        },
        "prensa_piernas_hsr": {
            "description": "Ejecución:\n1. Ubícate en la máquina de Prensa a 45 grados, piernas ancho de hombros en el plato.\n2. Presiona hacia arriba para soltar los seguros. \n3. Regla HSR: Baja (fase excéntrica) contando 4 segundos lentos, sostén 1 segundo y sube otros 4 segundos lentos.\n4. Emplea un peso considerable que te permita pocas repes pero mucha carga en los tendones.",
            "safety_notes": "Protocolo clínico puro. Relevante contra dolores tendinosos como rodilla del saltador. Nunca bloquear secamente la rodilla al tope superior. Descender hasta 90 grados cómodos de muslo/pantorrilla.",
            "muscles": "Cuádriceps, Glúteos, Isquiotibiales"
        },
        "yoga_movilidad_matutina": {
            "description": "Ejecución:\n1. Flujo continuo. Inicia en Gato-Vaca cuadrupedal (5x), pasando a Perro Boca Abajo (estira espalda e isquiotibiales).\n2. Baja a plancha fluida para hacer saludo al sol (Estiramiento de cobra) sintiendo extensión lumbar sana.\n3. Agrega posiciones de Paloma para abrir cadera de lado a lado.",
            "safety_notes": "Enfoque principal: Oxigenación, no dolor ni resistencia. Usa tu respiración. Si duele la lumbar en Cobra, sube menos o recarga en antebrazos.",
            "muscles": "Core, Espalda Baja, Cadera"
        },
        "split_squat_isometrico": {
            "description": "Ejecución:\n1. En posición de zancada o estocada.\n2. Baja hundiendo la cuenca pélvica hasta que ambas piernas dibujen 90 grados y la rodilla trasera roce el suelo.\n3. Bloqueate isométrica y estrictamente en este punto exacto (hold/sujeción estática).\n4. Resiste entre 30 y 45 segundos por lado.",
            "safety_notes": "Excelente generador de resiliencia de colágeno sin choque mecánico. Mantén tórax alto garantizando que la rodilla guía no se tambalee.",
            "muscles": "Cuádriceps, Glúteos, Tensores de cadera"
        }
    }

def update_db():
    conn = sqlite3.connect('c:/BioEngine_V3/db/bioengine_v3.db')
    cursor = conn.cursor()
    data = get_exercise_data()
    
    count = 0
    for exercise_id, info in data.items():
        # Update the ones that we mapped
        cursor.execute('''
            UPDATE exercises 
            SET description = ?, safety_notes = ?, muscles = ?
            WHERE id = ?
        ''', (info['description'], info['safety_notes'], info['muscles'], exercise_id))
        count += cursor.rowcount
        
    conn.commit()
    print(f"Massive update done. Updated {count} rows.")
    conn.close()

if __name__ == "__main__":
    update_db()
