# Roulette Api - NodeJS + Redis

## Requerimientos
```sh
1. Endpoint de creación de nuevas ruletas que devuelva el id de la nueva ruleta creada
2. Endpoint de apertura de ruleta (el input es un id de ruleta) que permita las
posteriores peticiones de apuestas, este debe devolver simplemente un estado que
confirme que la operación fue exitosa o denegada
3. Endpoint de apuesta a un número (los números válidos para apostar son del 0 al 36)
o color (negro o rojo) de la ruleta una cantidad determinada de dinero (máximo
10.000 dólares) a una ruleta abierta.
(nota: este enpoint recibe además de los parámetros de la apuesta, un id de usuario
en los HEADERS asumiendo que el servicio que haga la petición ya realizo una
autenticación y validación de que el cliente tiene el crédito necesario para realizar la
apuesta)
4. Endpoint de cierre apuestas dado un id de ruleta, este endpoint debe devolver el
resultado de las apuestas hechas desde su apertura hasta el cierre.
5. Endpoint de listado de ruletas creadas con sus estados (abierta o cerrada)
```

## Docker
Para ejecutarlo mediante docker, una vez clonado o copiado el proyecto, solo es necesario el siguiente comando en su consola:
```sh
docker-compose up -d --build
```

## Autenticación
El SECRET para el JsonWebToken es:
```sh
|This|Is|My|Secret|
```
Como parte de la autenticación se utiliza un JsonWebToken, puede utilizar el siguiente que ya ha sido generado con el secret antes mencionado sin fecha de expiración:
```sh
api_token = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1OTk1NzQ5Nzh9.IBf_k91pnZq1now5rIOH4SIS8tY1maxo45vOzB2F5oU
```
El token para la autenticación Basic se construye de la siguiente manera: 
``` 
userToken   = 'suNombreDeUsuario';
credentials = user_token + ":" + api_token;// concatena el user_token y el api_token
basic_token = base64(credentials);//calcula el base64 de tus credenciales.
```
En la cabecera authorization debe enviar el valor de su variable basic_token:
```
Authorization: Basic basic_token
```
## API Endpoints
| Method | Request | Endpoint | Body Example |
| ------ | ------ | ------ | ------ | 
| POST | Create Roulette | ```/api/roulettes/``` | Empty |
| PATCH | Open Roulette | ```/api/roulettes/:id``` | Empty |
| POST | Create Bet | ```/api/roulettes/:id/bets``` | ``` { amount:5000, bet:negro } ``` |
| PATCH | Close Roulette | ```/api/roulettes/:id/bets``` | Empty |
| GET | Get Roulettes | ```/api/roulettes/``` | Empty |

### ¿Cómo utilizar?
1. Cuando envia una peticion al endpoint ```/api/roulettes/``` se crea automáticamente su usuario enviado en el header Authorization con un crédito de 10000 USD
2. Como límite apuesta solo se permite un máximo de: ``` 10000 ```
3. Al apostar por color, solo se admiten los valores: ``` rojo ó negro ```
4. Al apostar por número, solo se admiten los valores: ``` 0 al 36 ```
